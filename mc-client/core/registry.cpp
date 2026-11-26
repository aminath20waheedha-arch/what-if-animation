#include "registry.h"
#include <fstream>
#include <sstream>

namespace mc {

Module* Registry::find(const std::string& name) {
    for (auto& m : modules_) if (m->name() == name) return m.get();
    return nullptr;
}

void Registry::tick(float dt) {
    for (auto& m : modules_) if (m->enabled()) m->onTick(dt);
}

void Registry::hit(const HitEvent& e) {
    for (auto& m : modules_) if (m->enabled()) m->onHit(e);
}

static std::string jstr(const std::string& s) {
    std::string o = "\"";
    for (char c : s) {
        if (c == '"' || c == '\\') { o += '\\'; o += c; }
        else if ((unsigned char)c < 0x20) o += ' ';
        else o += c;
    }
    return o + "\"";
}

static const char* typeName(SettingType t) {
    switch (t) {
        case SettingType::Bool: return "bool";
        case SettingType::Float: return "float";
        case SettingType::Int: return "int";
        case SettingType::Choice: return "choice";
    }
    return "float";
}

std::string Registry::toJson() const {
    std::ostringstream o;
    o << "{\"modules\":[";
    for (size_t i = 0; i < modules_.size(); i++) {
        auto& m = modules_[i];
        if (i) o << ",";
        o << "{\"name\":" << jstr(m->name()) << ",\"desc\":" << jstr(m->description())
          << ",\"enabled\":" << (m->enabled() ? "true" : "false") << ",\"settings\":[";
        auto& ss = m->settings();
        for (size_t j = 0; j < ss.size(); j++) {
            auto& s = ss[j];
            if (j) o << ",";
            o << "{\"id\":" << jstr(s.id) << ",\"label\":" << jstr(s.label)
              << ",\"type\":\"" << typeName(s.type) << "\",\"value\":" << s.value
              << ",\"min\":" << s.min << ",\"max\":" << s.max << ",\"step\":" << s.step
              << ",\"choices\":[";
            for (size_t k = 0; k < s.choices.size(); k++) o << (k ? "," : "") << jstr(s.choices[k]);
            o << "]}";
        }
        o << "]}";
    }
    o << "]}";
    return o.str();
}

std::string Registry::serialize() const {
    std::ostringstream o;
    for (auto& m : modules_) {
        o << m->name() << ".enabled=" << (m->enabled() ? 1 : 0) << "\n";
        for (auto& s : m->settings()) o << m->name() << "." << s.id << "=" << s.value << "\n";
    }
    return o.str();
}

void Registry::deserialize(const std::string& text) {
    std::istringstream in(text);
    std::string line;
    while (std::getline(in, line)) {
        auto eq = line.find('=');
        auto dot = line.find('.');
        if (eq == std::string::npos || dot == std::string::npos || dot > eq) continue;
        Module* m = find(line.substr(0, dot));
        if (!m) continue;
        std::string key = line.substr(dot + 1, eq - dot - 1);
        float v;
        try { v = std::stof(line.substr(eq + 1)); } catch (...) { continue; }
        if (key == "enabled") m->setEnabled(v >= 0.5f);
        else if (Setting* s = m->find(key)) s->set(v);
    }
}

bool Registry::save(const std::string& path) const {
    std::ofstream f(path);
    if (!f) return false;
    f << serialize();
    return (bool)f;
}

bool Registry::load(const std::string& path) {
    std::ifstream f(path);
    if (!f) return false;
    std::stringstream ss;
    ss << f.rdbuf();
    deserialize(ss.str());
    return true;
}

}  // namespace mc
