{
  "variables": {
    "runtime%": "node",
    "openssl_fips": "",
    "android_ndk_path": "",
    "v8_enable_pointer_compression%": 0,
    "v8_enable_31bit_smis_on_64bit_arch%": 0,
    "using_electron_config_gypi": 1
  },
  "conditions": [
    ["runtime=='electron'", {
      "defines": ["NODE_RUNTIME_ELECTRON=1"]
    }]
  ],
  "targets": [{
    "target_name": "leveldb",
    "variables": {
      "ldbversion": "1.23"
    },
    "type": "static_library",
    "standalone_static_library": 1,
    "dependencies": [
      "../snappy/snappy.gyp:snappy"
    ],
    "direct_dependent_settings": {
      "include_dirs": [
        "leveldb-<(ldbversion)/include/",
        "leveldb-<(ldbversion)/port/",
        "leveldb-<(ldbversion)/util",
        "leveldb-<(ldbversion)/"
      ]
    },
    "defines": [
      "SNAPPY=1"
    ],
    "include_dirs": [
      "leveldb-<(ldbversion)/",
      "leveldb-<(ldbversion)/include/"
    ],
    "conditions": [
      ["OS == 'win'", {
        "conditions": [
          ["MSVS_VERSION != '2015' and MSVS_VERSION != '2013'", {
            "include_dirs": [ "leveldb-<(ldbversion)/port/win/" ]
          }]
        ],
        "defines": [
          "LEVELDB_PLATFORM_WINDOWS=1",
          "NOMINMAX=1",
          "_HAS_EXCEPTIONS=0"
        ],
        "sources": [
          "leveldb-<(ldbversion)/util/env_windows.cc",
          "leveldb-<(ldbversion)/util/windows_logger.h"
        ],
        "msvs_settings": {
          "VCCLCompilerTool": {
            "RuntimeTypeInfo": "false",
            "EnableFunctionLevelLinking": "true",
            "ExceptionHandling": "1",
            "DisableSpecificWarnings": [ "4355", "4530" ,"4267", "4244" ]
          }
        }
      }, {
        "sources": [
          "leveldb-<(ldbversion)/util/env_posix.cc",
          "leveldb-<(ldbversion)/util/posix_logger.h"
        ],
        "defines": [
          "LEVELDB_PLATFORM_POSIX=1"
        ],
        "ccflags": [
          "-fno-builtin-memcmp",
          "-fPIC"
        ],
        "cflags": ["-std=c++14"],
        "cflags!": [ "-fno-tree-vrp" ]
      }],
      ["not (OS == 'win' or OS == 'freebsd')", {
        "cflags": [
          "-Wno-sign-compare",
          "-Wno-unused-but-set-variable"
        ]
      }],
      ["OS == 'linux'", {
        "defines": [
          "OS_LINUX=1"
        ],
        "libraries": [
          "-lpthread"
        ],
        "cflags": ["-std=c++14"],
        "cflags!": ["-fno-tree-vrp"],
        "ccflags": [
          "-pthread"
        ]
      }],
      ["OS == 'freebsd'", {
        "defines": [
          "OS_FREEBSD=1",
          "_REENTRANT=1"
        ],
        "libraries": [
          "-lpthread"
        ],
        "ccflags": [
          "-pthread"
        ],
        "cflags": [
          "-Wno-sign-compare"
        ]
      }],
      ["OS == 'openbsd'", {
        "defines": [
          "OS_OPENBSD=1",
          "_REENTRANT=1"
        ],
        "libraries": [
          "-lpthread"
        ],
        "ccflags": [
          "-pthread"
        ],
        "cflags": [
          "-Wno-sign-compare"
        ]
      }],
      ["OS == 'solaris'", {
        "defines": [
          "OS_SOLARIS=1",
          "_REENTRANT=1"
        ],
        "libraries": [
          "-lrt",
          "-lpthread"
        ],
        "ccflags": [
          "-pthread"
        ]
      }],
      ["OS == 'ios'", {
        "defines": [
          "OS_IOS=1"
        ],
        "libraries": [],
        "ccflags": [],
        "xcode_settings": {
          "WARNING_CFLAGS": [
            "-Wno-sign-compare",
            "-Wno-unused-variable",
            "-Wno-unused-function"
          ]
        }
      }],
      ["OS == 'mac'", {
        "defines": [
          "OS_MACOSX=1"
        ],
        "libraries": [],
        "ccflags": ["-std=c++14"],
        "xcode_settings": {
          "WARNING_CFLAGS": [
            "-Wno-sign-compare",
            "-Wno-unused-variable",
            "-Wno-unused-function"
          ],

          # Set minimum target version because we're building on newer
          "MACOSX_DEPLOYMENT_TARGET": "10.7",

          # Build universal binary to support M1 (Apple silicon)
          "OTHER_CFLAGS": [
            "-arch x86_64",
            "-arch arm64"
          ],

          "CLANG_CXX_LANGUAGE_STANDARD": "c++14",
          "CLANG_CXX_LIBRARY": "libc++"
        }
      }],
      ["OS == 'android'", {
        "defines": [
          "OS_ANDROID=1",
          "_REENTRANT=1"
        ],
        "libraries": [
          "-lpthread"
        ],
        "ccflags": [
          "-pthread",
          "-fno-builtin-memcmp"
        ],
        "cflags": [
          "-fPIC",
          "-std=c++14"
        ],
        "cflags!": [
          "-fPIE",
          "-Wno-unused-but-set-variable"
        ]
      }],
      ["target_arch == 'arm'", {
        "cflags": [
          "-mfloat-abi=hard"
        ]
      }]
    ],
    "sources": [
      "leveldb-<(ldbversion)/db/builder.cc",
      "leveldb-<(ldbversion)/db/builder.h",
      "leveldb-<(ldbversion)/db/c.cc",
      "leveldb-<(ldbversion)/db/db_impl.cc",
      "leveldb-<(ldbversion)/db/db_impl.h",
      "leveldb-<(ldbversion)/db/db_iter.cc",
      "leveldb-<(ldbversion)/db/db_iter.h",
      "leveldb-<(ldbversion)/db/dbformat.cc",
      "leveldb-<(ldbversion)/db/dbformat.h",
      "leveldb-<(ldbversion)/db/dumpfile.cc",
      "leveldb-<(ldbversion)/db/filename.cc",
      "leveldb-<(ldbversion)/db/filename.h",
      "leveldb-<(ldbversion)/db/leveldbutil.cc",
      "leveldb-<(ldbversion)/db/log_format.h",
      "leveldb-<(ldbversion)/db/log_reader.cc",
      "leveldb-<(ldbversion)/db/log_reader.h",
      "leveldb-<(ldbversion)/db/log_writer.cc",
      "leveldb-<(ldbversion)/db/log_writer.h",
      "leveldb-<(ldbversion)/db/memtable.cc",
      "leveldb-<(ldbversion)/db/memtable.h",
      "leveldb-<(ldbversion)/db/repair.cc",
      "leveldb-<(ldbversion)/db/skiplist.h",
      "leveldb-<(ldbversion)/db/snapshot.h",
      "leveldb-<(ldbversion)/db/table_cache.cc",
      "leveldb-<(ldbversion)/db/table_cache.h",
      "leveldb-<(ldbversion)/db/version_edit.cc",
      "leveldb-<(ldbversion)/db/version_edit.h",
      "leveldb-<(ldbversion)/db/version_set.cc",
      "leveldb-<(ldbversion)/db/version_set.h",
      "leveldb-<(ldbversion)/db/write_batch_internal.h",
      "leveldb-<(ldbversion)/db/write_batch.cc",
      "leveldb-<(ldbversion)/port/port_config.h.in",
      "leveldb-<(ldbversion)/port/port_stdcxx.h",
      "leveldb-<(ldbversion)/port/port.h",
      "leveldb-<(ldbversion)/port/thread_annotations.h",
      "leveldb-<(ldbversion)/table/block_builder.cc",
      "leveldb-<(ldbversion)/table/block_builder.h",
      "leveldb-<(ldbversion)/table/block.cc",
      "leveldb-<(ldbversion)/table/block.h",
      "leveldb-<(ldbversion)/table/filter_block.cc",
      "leveldb-<(ldbversion)/table/filter_block.h",
      "leveldb-<(ldbversion)/table/format.cc",
      "leveldb-<(ldbversion)/table/format.h",
      "leveldb-<(ldbversion)/table/iterator_wrapper.h",
      "leveldb-<(ldbversion)/table/iterator.cc",
      "leveldb-<(ldbversion)/table/merger.cc",
      "leveldb-<(ldbversion)/table/merger.h",
      "leveldb-<(ldbversion)/table/table_builder.cc",
      "leveldb-<(ldbversion)/table/table.cc",
      "leveldb-<(ldbversion)/table/two_level_iterator.cc",
      "leveldb-<(ldbversion)/table/two_level_iterator.h",
      "leveldb-<(ldbversion)/util/arena.cc",
      "leveldb-<(ldbversion)/util/arena.h",
      "leveldb-<(ldbversion)/util/bloom.cc",
      "leveldb-<(ldbversion)/util/cache.cc",
      "leveldb-<(ldbversion)/util/coding.cc",
      "leveldb-<(ldbversion)/util/coding.h",
      "leveldb-<(ldbversion)/util/comparator.cc",
      "leveldb-<(ldbversion)/util/crc32c.cc",
      "leveldb-<(ldbversion)/util/crc32c.h",
      "leveldb-<(ldbversion)/util/env.cc",
      "leveldb-<(ldbversion)/util/filter_policy.cc",
      "leveldb-<(ldbversion)/util/hash.cc",
      "leveldb-<(ldbversion)/util/hash.h",
      "leveldb-<(ldbversion)/util/histogram.cc",
      "leveldb-<(ldbversion)/util/histogram.h",
      "leveldb-<(ldbversion)/util/logging.cc",
      "leveldb-<(ldbversion)/util/logging.h",
      "leveldb-<(ldbversion)/util/mutexlock.h",
      "leveldb-<(ldbversion)/util/no_destructor.h",
      "leveldb-<(ldbversion)/util/options.cc",
      "leveldb-<(ldbversion)/util/random.h",
      "leveldb-<(ldbversion)/util/status.cc",
      "leveldb-<(ldbversion)/include/leveldb/c.h",
      "leveldb-<(ldbversion)/include/leveldb/cache.h",
      "leveldb-<(ldbversion)/include/leveldb/comparator.h",
      "leveldb-<(ldbversion)/include/leveldb/db.h",
      "leveldb-<(ldbversion)/include/leveldb/dumpfile.h",
      "leveldb-<(ldbversion)/include/leveldb/env.h",
      "leveldb-<(ldbversion)/include/leveldb/export.h",
      "leveldb-<(ldbversion)/include/leveldb/filter_policy.h",
      "leveldb-<(ldbversion)/include/leveldb/iterator.h",
      "leveldb-<(ldbversion)/include/leveldb/options.h",
      "leveldb-<(ldbversion)/include/leveldb/slice.h",
      "leveldb-<(ldbversion)/include/leveldb/status.h",
      "leveldb-<(ldbversion)/include/leveldb/table_builder.h",
      "leveldb-<(ldbversion)/include/leveldb/table.h",
      "leveldb-<(ldbversion)/include/leveldb/write_batch.h"
    ]
  }]
}