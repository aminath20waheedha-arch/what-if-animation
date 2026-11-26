// Our injected library. Loaded into the app process before Minecraft starts.
// Exposes the module registry to the Java click GUI, and checks that
// libminecraftpe.so is loaded in the same process (proof the injection works).
#include <jni.h>
#include <android/log.h>
#include <link.h>
#include <cstring>
#include <cstdio>
#include <mutex>
#include <string>
#include "core/registry.h"
#include "modules/hit_animation.h"

#define LOG(...) __android_log_print(ANDROID_LOG_INFO, "MCClient", __VA_ARGS__)

namespace {
std::mutex g_mu;
std::string g_cfg;

mc::Registry& reg() {
    static mc::Registry* r = [] {
        auto* x = new mc::Registry();
        x->add<mc::HitAnimation>();
        return x;
    }();
    return *r;
}

std::string str(JNIEnv* env, jstring s) {
    const char* c = env->GetStringUTFChars(s, nullptr);
    std::string out(c);
    env->ReleaseStringUTFChars(s, c);
    return out;
}

struct Found { uintptr_t base = 0; std::string path; };

int findGame(dl_phdr_info* info, size_t, void* data) {
    auto* f = static_cast<Found*>(data);
    if (info->dlpi_name && std::strstr(info->dlpi_name, "libminecraftpe.so")) {
        f->base = info->dlpi_addr;
        f->path = info->dlpi_name;
        return 1;
    }
    return 0;
}
}  // namespace

extern "C" {

JNIEXPORT jint JNI_OnLoad(JavaVM*, void*) {
    LOG("mcclient loaded");
    return JNI_VERSION_1_6;
}

JNIEXPORT void JNICALL Java_com_mcclient_launcher_Native_init(JNIEnv* env, jclass, jstring cfg) {
    std::lock_guard<std::mutex> l(g_mu);
    g_cfg = str(env, cfg);
    reg().load(g_cfg);
}

JNIEXPORT jstring JNICALL Java_com_mcclient_launcher_Native_modulesJson(JNIEnv* env, jclass) {
    std::lock_guard<std::mutex> l(g_mu);
    return env->NewStringUTF(reg().toJson().c_str());
}

JNIEXPORT void JNICALL Java_com_mcclient_launcher_Native_setEnabled(JNIEnv* env, jclass, jstring mod, jboolean on) {
    std::lock_guard<std::mutex> l(g_mu);
    if (auto* m = reg().find(str(env, mod))) m->setEnabled(on);
}

JNIEXPORT void JNICALL Java_com_mcclient_launcher_Native_setSetting(JNIEnv* env, jclass, jstring mod, jstring id, jfloat v) {
    std::lock_guard<std::mutex> l(g_mu);
    if (auto* m = reg().find(str(env, mod)))
        if (auto* s = m->find(str(env, id))) s->set(v);
}

JNIEXPORT void JNICALL Java_com_mcclient_launcher_Native_save(JNIEnv*, jclass) {
    std::lock_guard<std::mutex> l(g_mu);
    if (!g_cfg.empty()) reg().save(g_cfg);
}

JNIEXPORT jstring JNICALL Java_com_mcclient_launcher_Native_gameStatus(JNIEnv* env, jclass) {
    Found f;
    dl_iterate_phdr(findGame, &f);
    char buf[512];
    if (f.base) {
        std::snprintf(buf, sizeof buf, "Injected OK - libminecraftpe.so at 0x%lx", (unsigned long)f.base);
        LOG("%s (%s)", buf, f.path.c_str());
    } else {
        std::snprintf(buf, sizeof buf, "libminecraftpe.so is not loaded yet");
    }
    return env->NewStringUTF(buf);
}

}  // extern "C"
