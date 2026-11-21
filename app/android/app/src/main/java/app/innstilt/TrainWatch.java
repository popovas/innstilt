package app.innstilt;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Background check for cancelled or badly late trains on the user's regular trips (opt-in, Android app only).
 *
 * Every ~15 minutes (Android's WorkManager; network required) and only around the usual departure times (from
 * 2 h before to 30 min after), it asks Entur's open Journey Planner about Vy trains from the trip's first station
 * to its second, departing within 30 min of a usual time. A train that is cancelled, or expected to arrive more
 * than 30 min late, gives one notification. What it knows: station ids/names and usual times, set by the app
 * (no ticket, name or account). Nothing is sent anywhere except the timetable query to Entur.
 */
public class TrainWatch extends Worker {

    static final String WORK = "innstilt-train-watch";
    static final String PREFS = "innstilt-train-watch";
    static final String CHANNEL = "trains";
    private static final String JP = "https://api.entur.io/journey-planner/v3/graphql";
    private static final ZoneId OSLO = ZoneId.of("Europe/Oslo");
    static final int LATE_MIN = 30;
    private static final String QUERY =
        "query($id:String!,$t:DateTime!){stopPlace(id:$id){estimatedCalls(startTime:$t,timeRange:10800,numberOfDepartures:200," +
        "whiteListedModes:[rail],includeCancelledTrips:true){aimedDepartureTime cancellation serviceJourney{id line{publicCode}" +
        " estimatedCalls{quay{stopPlace{id parent{id}}} aimedArrivalTime expectedArrivalTime cancellation realtime}}}}}";

    public TrainWatch(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    /** Starts (or replaces) the periodic check. */
    static void schedule(Context ctx) {
        Constraints c = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        PeriodicWorkRequest req = new PeriodicWorkRequest.Builder(TrainWatch.class, 15, TimeUnit.MINUTES).setConstraints(c).build();
        WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.UPDATE, req);
    }

    static void cancel(Context ctx) {
        WorkManager.getInstance(ctx).cancelUniqueWork(WORK);
    }

    @NonNull
    @Override
    public Result doWork() {
        try {
            check(getApplicationContext(), ZonedDateTime.now(OSLO), LATE_MIN);
        } catch (Exception e) {
            return Result.success();  /* try again at the next interval; never retry-storm Entur */
        }
        return Result.success();
    }

    /** One round: also called directly by "check now" from the app. Returns how many notifications were shown. */
    static int check(Context ctx, ZonedDateTime now, int lateLimit) throws Exception {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!p.getBoolean("enabled", false)) return 0;
        JSONObject cfg = new JSONObject(p.getString("config", "{}"));
        boolean en = "en".equals(cfg.optString("lang"));
        JSONArray legs = cfg.optJSONArray("legs");
        if (legs == null) return 0;
        Set<String> done = new HashSet<>(p.getStringSet("notified", new HashSet<>()));
        int shown = 0;
        for (int i = 0; i < legs.length(); i++) {
            JSONObject leg = legs.getJSONObject(i);
            JSONArray times = leg.optJSONArray("times");
            if (times == null || times.length() == 0) continue;
            boolean near = false;
            for (int k = 0; k < times.length(); k++) {
                long m = minutesFromNow(now, times.getString(k));
                if (m <= 120 && m >= -30) { near = true; break; }
            }
            if (!near) continue;
            JSONArray calls = departures(leg.getString("from"), now.minusMinutes(30));
            for (int c = 0; c < calls.length(); c++) {
                JSONObject call = calls.getJSONObject(c);
                JSONObject sj = call.getJSONObject("serviceJourney");
                if (!sj.getString("id").startsWith("VYG:")) continue;  /* Vy's trains only */
                ZonedDateTime dep = OffsetDateTime.parse(call.getString("aimedDepartureTime")).atZoneSameInstant(OSLO);
                if (!closeToUsual(dep, times)) continue;
                JSONObject arr = arrivalAt(sj.getJSONArray("estimatedCalls"), leg.getString("from"), leg.getString("to"));
                if (arr == null) continue;
                boolean cancelled = call.optBoolean("cancellation") || arr.optBoolean("cancellation");
                long lateMin = 0;
                if (!cancelled && arr.optBoolean("realtime") && !arr.isNull("expectedArrivalTime")) {
                    lateMin = Duration.between(OffsetDateTime.parse(arr.getString("aimedArrivalTime")),
                        OffsetDateTime.parse(arr.getString("expectedArrivalTime"))).toMinutes();
                }
                if (!cancelled && lateMin <= lateLimit) continue;
                String key = sj.getString("id") + "|" + dep.toLocalDate() + "|" + (cancelled ? "c" : "l");
                if (done.contains(key)) continue;
                done.add(key);
                String line = sj.getJSONObject("line").optString("publicCode");
                String hhmm = String.format("%02d:%02d", dep.getHour(), dep.getMinute());
                String route = leg.optString("fromName") + " → " + leg.optString("toName");
                String title = cancelled
                    ? (en ? "Cancelled: " : "Innstilt: ") + line + " " + hhmm
                    : line + " " + hhmm + (en ? " expected " + lateMin + " min late" : " ventet " + lateMin + " min forsinket");
                String text = route + (en ? " – tap to claim compensation" : " – trykk for å kreve erstatning");
                notify(ctx, key.hashCode(), title, text);
                shown++;
            }
        }
        /* keep the "already notified" list short: only today's and yesterday's trains matter */
        String today = now.toLocalDate().toString(), yesterday = now.toLocalDate().minusDays(1).toString();
        done.removeIf(k -> !k.contains("|" + today + "|") && !k.contains("|" + yesterday + "|"));
        p.edit().putStringSet("notified", done).apply();
        return shown;
    }

    private static long minutesFromNow(ZonedDateTime now, String hhmm) {
        LocalTime t = LocalTime.parse(hhmm);
        long m = Duration.between(now.toLocalTime(), t).toMinutes();
        if (m < -720) m += 1440;  /* e.g. 23:50 now, 00:10 usual */
        if (m > 720) m -= 1440;
        return m;
    }

    private static boolean closeToUsual(ZonedDateTime dep, JSONArray times) throws Exception {
        for (int k = 0; k < times.length(); k++) {
            long m = Math.abs(Duration.between(dep.toLocalTime(), LocalTime.parse(times.getString(k))).toMinutes());
            if (m > 720) m = 1440 - m;
            if (m <= 30) return true;
        }
        return false;
    }

    private static String stationOf(JSONObject call) throws Exception {
        JSONObject sp = call.getJSONObject("quay").getJSONObject("stopPlace");
        JSONObject parent = sp.optJSONObject("parent");
        return parent != null ? parent.getString("id") : sp.getString("id");
    }

    /** The call at `to` after the call at `from`, or null if the train doesn't go there. */
    private static JSONObject arrivalAt(JSONArray calls, String from, String to) throws Exception {
        int a = -1;
        for (int i = 0; i < calls.length(); i++) {
            String st = stationOf(calls.getJSONObject(i));
            if (a < 0 && st.equals(from)) a = i;
            else if (a >= 0 && st.equals(to)) return calls.getJSONObject(i);
        }
        return null;
    }

    private static JSONArray departures(String stationId, ZonedDateTime from) throws Exception {
        JSONObject vars = new JSONObject().put("id", stationId).put("t", from.toOffsetDateTime().toString());
        byte[] body = new JSONObject().put("query", QUERY).put("variables", vars).toString().getBytes(StandardCharsets.UTF_8);
        HttpURLConnection con = (HttpURLConnection) new URL(JP).openConnection();
        con.setConnectTimeout(15000);
        con.setReadTimeout(20000);
        con.setRequestMethod("POST");
        con.setRequestProperty("Content-Type", "application/json");
        con.setRequestProperty("ET-Client-Name", "innstilt-android");
        con.setDoOutput(true);
        try (OutputStream os = con.getOutputStream()) { os.write(body); }
        try (InputStream is = con.getInputStream()) {
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = is.read(buf)) > 0) bo.write(buf, 0, n);
            JSONObject res = new JSONObject(bo.toString("UTF-8"));
            JSONObject sp = res.getJSONObject("data").optJSONObject("stopPlace");
            return sp == null ? new JSONArray() : sp.getJSONArray("estimatedCalls");
        } finally {
            con.disconnect();
        }
    }

    static void ensureChannel(Context ctx, boolean en) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, en ? "Cancelled and late trains" : "Innstilte og forsinkede tog",
            NotificationManager.IMPORTANCE_DEFAULT);
        ch.setDescription(en ? "Your regular trains, around your usual times" : "Dine faste tog, rundt de vanlige avgangene");
        ctx.getSystemService(NotificationManager.class).createNotificationChannel(ch);
    }

    static void notify(Context ctx, int id, String title, String text) {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        ensureChannel(ctx, false);
        Intent open = new Intent(ctx, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_innstilt)
            .setColor(0xFF1C5A4A)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
            .setContentIntent(pi)
            .setAutoCancel(true);
        NotificationManagerCompat.from(ctx).notify(id, b.build());
    }
}
