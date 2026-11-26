// Holds all modules and saves/loads their state as a plain "module.setting=value" file.
#pragma once
#include <memory>
#include <string>
#include <vector>
#include "module.h"

namespace mc {

class Registry {
public:
    template <class T, class... A> T& add(A&&... a) {
        auto m = std::make_unique<T>(std::forward<A>(a)...);
        T& ref = *m;
        modules_.push_back(std::move(m));
        return ref;
    }
    std::vector<std::unique_ptr<Module>>& modules() { return modules_; }
    Module* find(const std::string& name);

    void tick(float dt);
    void hit(const HitEvent& e);

    std::string toJson() const;  // full module/setting description for the click GUI
    std::string serialize() const;
    void deserialize(const std::string& text);  // unknown keys are ignored (version-safe)
    bool save(const std::string& path) const;
    bool load(const std::string& path);

private:
    std::vector<std::unique_ptr<Module>> modules_;
};

}  // namespace mc
