package com.lifegoalapp.habitgame;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugin (not an npm package), so it is registered here.
        registerPlugin(NativeCompassAIPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
