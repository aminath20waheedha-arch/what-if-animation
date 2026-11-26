// Settings: every option a module exposes. The menu is generated from these,
// so adding a setting to a module automatically adds it to the UI.
#pragma once
#include <string>
#include <vector>
#include <algorithm>

namespace mc {

enum class SettingType { Bool, Float, Int, Choice };

struct Setting {
    std::string id;     // stable key used in the config file
    std::string label;  // text shown in the menu
    SettingType type;
    float value;        // Bool: 0/1, Int/Choice: index, Float: value
    float min = 0, max = 1, step = 0.01f;
    std::vector<std::string> choices;  // Choice only

    static Setting Bool(std::string id, std::string label, bool v) {
        return {std::move(id), std::move(label), SettingType::Bool, v ? 1.f : 0.f, 0, 1, 1, {}};
    }
    static Setting Float(std::string id, std::string label, float v, float lo, float hi, float step = 0.01f) {
        return {std::move(id), std::move(label), SettingType::Float, v, lo, hi, step, {}};
    }
    static Setting Int(std::string id, std::string label, int v, int lo, int hi) {
        return {std::move(id), std::move(label), SettingType::Int, (float)v, (float)lo, (float)hi, 1, {}};
    }
    static Setting Choice(std::string id, std::string label, std::vector<std::string> opts, int idx = 0) {
        float hi = opts.empty() ? 0.f : (float)(opts.size() - 1);
        return {std::move(id), std::move(label), SettingType::Choice, (float)idx, 0, hi, 1, std::move(opts)};
    }

    void set(float v) {
        v = std::clamp(v, min, max);
        if (type != SettingType::Float) v = (float)(int)(v + 0.5f);
        value = v;
    }
    bool asBool() const { return value >= 0.5f; }
    int asInt() const { return (int)(value + 0.5f); }
};

}  // namespace mc
