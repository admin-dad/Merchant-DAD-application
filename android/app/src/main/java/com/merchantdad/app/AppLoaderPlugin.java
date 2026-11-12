package com.merchantdad.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Lets the website remove the native startup loader once its first screen is ready.
@CapacitorPlugin(name = "AppLoader")
public class AppLoaderPlugin extends Plugin {
    @PluginMethod
    public void hide(PluginCall call) {
        if (getActivity() instanceof MainActivity) {
            ((MainActivity) getActivity()).hideAppLoader();
        }
        call.resolve();
    }
}
