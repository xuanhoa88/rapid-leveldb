{
  "variables": {
    "runtime%": "node",
    "openssl_fips": "",
    "android_ndk_path": "",
    "v8_enable_pointer_compression%": 0,
    "v8_enable_31bit_smis_on_64bit_arch%": 0,
    "using_electron_config_gypi": 1,
  },
  "conditions": [
    ['runtime=="electron"', {
        'defines': ['NODE_RUNTIME_ELECTRON=1']
    }],
  ],
  "targets": [{
    "target_name": "classic_level",
    "conditions": [
      ["OS == 'win'", {
        "defines": [
          "_HAS_EXCEPTIONS=0"
        ],
        "msvs_settings": {
          "VCCLCompilerTool": {
            "RuntimeTypeInfo": "false",
            "EnableFunctionLevelLinking": "true",
            "ExceptionHandling": "1",
            "DisableSpecificWarnings": [ "4355", "4530" ,"4267", "4244", "4506" ]
          }
        }
      }],
      ["OS == 'linux'", {
        "cflags": ["-std=c++14"],
        "cflags!": ["-fno-tree-vrp"]
      }],
      ["OS == 'mac'", {
        "cflags+": ["-fvisibility=hidden", "-std=c++14"],
        "xcode_settings": {
          # -fvisibility=hidden
          "GCC_SYMBOLS_PRIVATE_EXTERN": "YES",

          # Set minimum target version because we're building on newer
          # Same as https://github.com/nodejs/node/blob/v10.0.0/common.gypi#L416
          "MACOSX_DEPLOYMENT_TARGET": "10.7",

          # Build universal binary to support M1 (Apple silicon)
          "OTHER_CFLAGS": [
            "-arch x86_64",
            "-arch arm64"
          ],
          "OTHER_LDFLAGS": [
            "-arch x86_64",
            "-arch arm64"
          ],

          "CLANG_CXX_LANGUAGE_STANDARD": "c++14",
          "CLANG_CXX_LIBRARY": "libc++"
        }
      }],
      ["OS == 'android'", {
        "cflags": [ "-fPIC", "-std=c++14" ],
        "ldflags": [ "-fPIC" ],
        "cflags!": [
          "-fno-tree-vrp",
          "-mfloat-abi=hard",
          "-fPIE"
        ],
        "ldflags!": [ "-fPIE" ]
      }],
      ["target_arch == 'arm'", {
        "cflags": [ "-mfloat-abi=hard" ]
      }]
    ],
    "dependencies": [
      "<(module_root_dir)/vendor/leveldb/leveldb-1.23.gyp:leveldb"
    ],
    "include_dirs"  : [
      "<!(node -e \"require('napi-macros')\")"
    ],
    "sources": [
      "./src/binding.cc"
    ]
  }]
}
