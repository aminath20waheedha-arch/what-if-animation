// A Module is one feature (HUD item, hit animation, zoom...). Add a feature by
// subclassing Module, declaring its settings, and registering it.
#pragma once
#include <string>
#include <vector>
#include "setting.h"

namespace mc {

struct HitEvent { float damage; bool critical; };

class Module {
public:
    Module(std::string name, std::string description)
        : name_(std::move(name)), desc_(std::move(description)) {}
    virtual ~Module() = default;

    const std::string& name() const { return name_; }
    const std::string& description() const { return desc_; }
    bool enabled() const { return enabled_; }
    void setEnabled(bool e) { enabled_ = e; }

    std::vector<Setting>& settings() { return settings_; }
    Setting* find(const std::string& id) {
        for (auto& s : settings_) if (s.id == id) return &s;
        return nullptr;
    }

    // Hooks the game layer calls. Default: do nothing.
    virtual void onTick(float /*dt*/) {}
    virtual void onHit(const HitEvent&) {}

protected:
    Setting& add(Setting s) { settings_.push_back(std::move(s)); return settings_.back(); }

private:
    std::string name_, desc_;
    bool enabled_ = false;
    std::vector<Setting> settings_;
};

}  // namespace mc
