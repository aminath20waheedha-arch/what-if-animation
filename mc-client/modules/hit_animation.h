// Hit animation: when you land a hit, the held item / view does a short animated
// reaction. This file is only the math + settings; the game hook reads
// offset()/scale()/rotation() each frame and applies them to the item transform.
#pragma once
#include <cmath>
#include "../core/module.h"

namespace mc {

class HitAnimation : public Module {
public:
    HitAnimation() : Module("HitAnimation", "Animated reaction when you hit something") {
        add(Setting::Choice("style", "Style", {"Punch", "Wobble", "Spin", "Bounce"}, 0));
        add(Setting::Float("duration", "Duration (s)", 0.30f, 0.05f, 1.5f));
        add(Setting::Float("intensity", "Intensity", 1.0f, 0.0f, 3.0f));
        add(Setting::Float("scale_pulse", "Scale pulse", 0.15f, 0.0f, 0.6f));
        add(Setting::Bool("crit_boost", "Stronger on crits", true));
        add(Setting::Float("crit_mult", "Crit multiplier", 1.5f, 1.0f, 3.0f));
    }

    void onHit(const HitEvent& e) override {
        t_ = 0.f;
        active_ = true;
        boost_ = (e.critical && find("crit_boost")->asBool()) ? find("crit_mult")->value : 1.f;
    }
    void onTick(float dt) override {
        if (!active_) return;
        t_ += dt;
        if (t_ >= find("duration")->value) active_ = false;
    }

    bool active() const { return active_; }
    // 0 -> 1 progress through the animation.
    float progress() const {
        float d = const_cast<HitAnimation*>(this)->find("duration")->value;
        return active_ ? std::fmin(t_ / d, 1.f) : 1.f;
    }
    // Fast-in, smooth-out envelope: 0 at start and end, peaks early.
    float envelope() const {
        if (!active_) return 0.f;
        float p = progress();
        return std::sin(p * 3.14159265f) * (1.f - p * 0.5f);
    }
    float strength() const {
        return envelope() * const_cast<HitAnimation*>(this)->find("intensity")->value * boost_;
    }
    // Forward push of the item (game units).
    float offset() const {
        int style = const_cast<HitAnimation*>(this)->find("style")->asInt();
        float s = strength();
        switch (style) {
            case 0: return -0.25f * s;                                    // Punch
            case 3: return 0.2f * s * std::fabs(std::cos(progress() * 9.42f));  // Bounce
            default: return -0.08f * s;
        }
    }
    // Rotation in degrees.
    float rotation() const {
        int style = const_cast<HitAnimation*>(this)->find("style")->asInt();
        float s = strength();
        switch (style) {
            case 1: return 18.f * s * std::sin(progress() * 25.13f);       // Wobble
            case 2: return 360.f * progress() * (active_ ? std::fmin(strength(), 1.f) : 0.f);  // Spin
            default: return 0.f;
        }
    }
    float scale() const {
        return 1.f + const_cast<HitAnimation*>(this)->find("scale_pulse")->value * strength();
    }

private:
    bool active_ = false;
    float t_ = 0.f, boost_ = 1.f;
};

}  // namespace mc
