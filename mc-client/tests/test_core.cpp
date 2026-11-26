#include <cassert>
#include <cstdio>
#include "../core/registry.h"
#include "../modules/hit_animation.h"

using namespace mc;

int main() {
    Registry r;
    auto& hit = r.add<HitAnimation>();
    hit.setEnabled(true);

    // Idle: no effect.
    assert(!hit.active() && hit.scale() == 1.f && hit.offset() == 0.f);

    // A hit starts the animation and it finishes after `duration`.
    r.hit({5.f, false});
    r.tick(0.05f);
    assert(hit.active() && hit.scale() > 1.f);
    for (int i = 0; i < 100; i++) r.tick(0.01f);
    assert(!hit.active() && hit.scale() == 1.f);

    // Crits are stronger when crit_boost is on.
    r.hit({5.f, false}); r.tick(0.05f); float normal = hit.strength();
    r.hit({5.f, true});  r.tick(0.05f); float crit = hit.strength();
    assert(crit > normal);
    hit.find("crit_boost")->set(0);
    r.hit({5.f, true});  r.tick(0.05f);
    assert(hit.strength() == normal);

    // Settings clamp to their range.
    hit.find("intensity")->set(99.f);
    assert(hit.find("intensity")->value == 3.f);

    // Save/load round trip + unknown keys ignored.
    hit.find("style")->set(2);
    hit.find("duration")->set(0.5f);
    std::string saved = r.serialize();
    Registry r2;
    auto& hit2 = r2.add<HitAnimation>();
    r2.deserialize(saved + "Removed.thing=1\nbadline\n");
    assert(hit2.enabled() && hit2.find("style")->asInt() == 2);
    assert(hit2.find("duration")->value == 0.5f);

    std::puts("all tests passed");
    return 0;
}
