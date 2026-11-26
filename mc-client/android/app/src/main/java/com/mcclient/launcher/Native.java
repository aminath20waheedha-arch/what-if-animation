package com.mcclient.launcher;

/** Bridge to our native library (libmcclient.so). */
final class Native {
    private Native() {}
    static native void init(String configPath);
    static native String modulesJson();
    static native void setEnabled(String module, boolean on);
    static native void setSetting(String module, String id, float value);
    static native void save();
    static native String gameStatus();
}
