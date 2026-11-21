package app.innstilt;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TrainWatchPlugin.class);  /* our own plugin: the background train check */
        super.onCreate(savedInstanceState);
    }
}
