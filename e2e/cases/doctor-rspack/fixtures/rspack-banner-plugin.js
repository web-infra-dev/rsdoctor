var header = 11111111;
console.log(header);

console.log('RSDOCTOR_START::');
(function () {
  var __webpack_modules__ = {
    './cases/doctor-rspack/fixtures/a.js': function (
      __unused_webpack_module,
      __unused_webpack_exports,
      __webpack_require__,
    ) {
      console.log('a');
      var a = __webpack_require__(
        /*! ./index */ './cases/doctor-rspack/fixtures/index.ts',
      ) /* .a */.a;
      console.log(a); // ""
      // hello world
    },
    './cases/doctor-rspack/fixtures/index.ts': function (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) {
      'use strict';
      __webpack_require__.r(__webpack_exports__);
      __webpack_require__.d(__webpack_exports__, {
        a: function () {
          return a;
        },
      });
      var a = 1;
    },
  };
  // The module cache
  var __webpack_module_cache__ = {};
  function __webpack_require__(moduleId) {
    // Check if module is in cache
    var cachedModule = __webpack_module_cache__[moduleId];
    if (cachedModule !== undefined) {
      return cachedModule.exports;
    }
    // Create a new module (and put it into the cache)
    var module = (__webpack_module_cache__[moduleId] = {
      exports: {},
    });
    // Execute the module function
    __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
    // Return the exports of the module
    return module.exports;
  }
  // webpack/runtime/define_property_getters
  !(function () {
    __webpack_require__.d = function (exports, definition) {
      for (var key in definition) {
        if (
          __webpack_require__.o(definition, key) &&
          !__webpack_require__.o(exports, key)
        ) {
          Object.defineProperty(exports, key, {
            enumerable: true,
            get: definition[key],
          });
        }
      }
    };
  })();
  // webpack/runtime/make_namespace_object
  !(function () {
    // define __esModule on exports
    __webpack_require__.r = function (exports) {
      if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
        Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
      }
      Object.defineProperty(exports, '__esModule', { value: true });
    };
  })();
  // webpack/runtime/has_own_property
  !(function () {
    __webpack_require__.o = function (obj, prop) {
      return Object.prototype.hasOwnProperty.call(obj, prop);
    };
  })();
  var __webpack_exports__ = __webpack_require__(
    './cases/doctor-rspack/fixtures/a.js',
  );
})();

console.log('RSDOCTOR_END::');

var footer = 22222222;
console.log(footer);
