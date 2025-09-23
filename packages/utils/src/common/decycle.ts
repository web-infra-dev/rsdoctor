/**
 * The following code is based on
 * https://github.com/valery-barysok/json-cycle/blob/master/cycle.js
 *
 *
 * MIT Licensed
 * Author juliyvchirkov
 * https://github.com/valery-barysok/json-cycle?tab=MIT-1-ov-file
 */
export function decycle<T = any>(object: T): T {
  const objects: any[] = [];
  const paths: string[] = [];

  function derez(value: any, path: string): any {
    let _value = value;

    try {
      _value = value.toJSON();
    } catch {
      // Ignore toJSON errors
    }

    if (typeof _value === 'object' && _value) {
      for (let i = 0; i < objects.length; i += 1) {
        if (objects[i] === _value) {
          return { $ref: paths[i] };
        }
      }

      objects.push(_value);
      paths.push(path);

      let nu: any;

      if (Object.prototype.toString.apply(_value) === '[object Array]') {
        nu = [];
        for (let i = 0; i < _value.length; i += 1) {
          nu[i] = derez(_value[i], path + '[' + i + ']');
        }
      } else {
        nu = {};
        for (const name in _value) {
          if (Object.hasOwn(_value, name)) {
            nu[name] = derez(
              _value[name],
              path + '[' + JSON.stringify(name) + ']',
            );
          }
        }
      }

      return nu;
    }

    return _value;
  }

  return derez(object, '$');
}
