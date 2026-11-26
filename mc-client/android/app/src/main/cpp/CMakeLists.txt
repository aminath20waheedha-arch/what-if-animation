cmake_minimum_required(VERSION 3.22.1)
project(mcclient CXX)
set(CMAKE_CXX_STANDARD 17)
# mc-client/ root: shared core used by both the PC tests and the Android lib.
set(ROOT ${CMAKE_CURRENT_SOURCE_DIR}/../../../../..)
add_library(mcclient SHARED jni_bridge.cpp ${ROOT}/core/registry.cpp)
target_include_directories(mcclient PRIVATE ${ROOT})
target_link_libraries(mcclient log)
