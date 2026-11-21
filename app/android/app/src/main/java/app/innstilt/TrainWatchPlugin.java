package app.innstilt;

import android.Manifest;
import android.content.Context;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.time.ZoneId;
import java.time.ZonedDateTime;

/** The app's switch for the background train check (TrainWatch): settings in, permission, test, check now. */
@CapacitorPlugin(name = "TrainWatch", permissions = {
    @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications") })
public class TrainWatchPlugin extends Plugin {

    /** {enabled, config: {lang, legs: [{from, to, fromName, toName, times: ["16:54"]}]}} */
    @PluginMethod
    public void configure(PluginCall call) {
        Context ctx = getContext();
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        JSObject cfg = call.getObject("config", new JSObject());
        ctx.getSharedPreferences(TrainWatch.PREFS, Context.MODE_PRIVATE).edit()
            .putBoolean("enabled", enabled).putString("config", cfg.toString()).apply();
        TrainWatch.ensureChannel(ctx, "en".equals(cfg.getString("lang")));
        if (enabled) TrainWatch.schedule(ctx); else TrainWatch.cancel(ctx);
        call.resolve();
    }

    @PluginMethod
    public void requestNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED) {
            JSObject r = new JSObject(); r.put("granted", true); call.resolve(r);
        } else {
            requestPermissionForAlias("notifications", call, "permissionDone");
        }
    }

    @PermissionCallback
    private void permissionDone(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", getPermissionState("notifications") == PermissionState.GRANTED);
        call.resolve(r);
    }

    @PluginMethod
    public void test(PluginCall call) {
        TrainWatch.notify(getContext(), 1, call.getString("title", "Innstilt"), call.getString("text", ""));
        call.resolve();
    }

    /** Runs one round right away (for testing); resolves with how many notifications were shown. */
    @PluginMethod
    public void checkNow(PluginCall call) {
        new Thread(() -> {
            try {
                /* lateMin: testing only (e.g. -999 makes every train count as late); the background job always uses 30 */
                int n = TrainWatch.check(getContext(), ZonedDateTime.now(ZoneId.of("Europe/Oslo")), call.getInt("lateMin", TrainWatch.LATE_MIN));
                JSObject r = new JSObject(); r.put("shown", n); call.resolve(r);
            } catch (Exception e) {
                call.reject(String.valueOf(e.getMessage()));
            }
        }).start();
    }
}
