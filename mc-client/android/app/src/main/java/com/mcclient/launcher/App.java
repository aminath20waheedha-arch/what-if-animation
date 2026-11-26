package com.mcclient.launcher;

import android.app.Application;
import android.content.Context;
import java.io.File;

/**
 * Runs first in our process. Loads our .so, then makes the installed Minecraft's
 * code and native libraries loadable from inside our app.
 */
public class App extends Application {
    @Override
    protected void attachBaseContext(Context base) {
        super.attachBaseContext(base);
        System.loadLibrary("mcclient");   // our lib goes in before the game
        GameLoader.inject(base);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        Native.init(new File(getFilesDir(), "mcclient.cfg").getPath());
    }
}
