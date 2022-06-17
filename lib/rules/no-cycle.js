'use strict';var _slicedToArray = function () {function sliceIterator(arr, i) {var _arr = [];var _n = true;var _d = false;var _e = undefined;try {for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {_arr.push(_s.value);if (i && _arr.length === i) break;}} catch (err) {_d = true;_e = err;} finally {try {if (!_n && _i["return"]) _i["return"]();} finally {if (_d) throw _e;}}return _arr;}return function (arr, i) {if (Array.isArray(arr)) {return arr;} else if (Symbol.iterator in Object(arr)) {return sliceIterator(arr, i);} else {throw new TypeError("Invalid attempt to destructure non-iterable instance");}};}(); /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       * @fileOverview Ensures that no imported module imports the linted module.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       * @author Ben Mosher
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       */

var _resolve = require('eslint-module-utils/resolve');var _resolve2 = _interopRequireDefault(_resolve);
var _ExportMap = require('../ExportMap');var _ExportMap2 = _interopRequireDefault(_ExportMap);
var _importType = require('../core/importType');
var _moduleVisitor = require('eslint-module-utils/moduleVisitor');var _moduleVisitor2 = _interopRequireDefault(_moduleVisitor);
var _docsUrl = require('../docsUrl');var _docsUrl2 = _interopRequireDefault(_docsUrl);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { 'default': obj };}function _toConsumableArray(arr) {if (Array.isArray(arr)) {for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {arr2[i] = arr[i];}return arr2;} else {return Array.from(arr);}}

// todo: cache cycles / deep relationships for faster repeat evaluation
module.exports = {
  meta: {
    type: 'suggestion',
    docs: { url: (0, _docsUrl2['default'])('no-cycle') },
    schema: [(0, _moduleVisitor.makeOptionsSchema)({
      maxDepth: {
        oneOf: [
        {
          description: 'maximum dependency depth to traverse',
          type: 'integer',
          minimum: 1 },

        {
          'enum': ['∞'],
          type: 'string' }] },



      ignoreExternal: {
        description: 'ignore external modules',
        type: 'boolean',
        'default': false },

      allowUnsafeDynamicCyclicDependency: {
        description: 'Allow cyclic dependency if there is at least one dynamic import in the chain',
        type: 'boolean',
        'default': false } })] },




  create: function () {function create(context) {
      var myPath = context.getPhysicalFilename ? context.getPhysicalFilename() : context.getFilename();
      if (myPath === '<text>') return {}; // can't cycle-check a non-file

      var options = context.options[0] || {};
      var maxDepth = typeof options.maxDepth === 'number' ? options.maxDepth : Infinity;
      var ignoreModule = function () {function ignoreModule(name) {return options.ignoreExternal && (0, _importType.isExternalModule)(
          name,
          (0, _resolve2['default'])(name, context),
          context);}return ignoreModule;}();


      function checkSourceValue(sourceNode, importer) {
        if (ignoreModule(sourceNode.value)) {
          return; // ignore external modules
        }
        if (options.allowUnsafeDynamicCyclicDependency && (
        // Ignore `import()`
        importer.type === 'ImportExpression' ||
        // `require()` calls are always checked (if possible)
        importer.type === 'CallExpression' && importer.callee.name !== 'require')) {
          return; // cycle via dynamic import allowed by config
        }

        if (
        importer.type === 'ImportDeclaration' && (
        // import type { Foo } (TS and Flow)
        importer.importKind === 'type' ||
        // import { type Foo } (Flow)
        importer.specifiers.every(function (_ref) {var importKind = _ref.importKind;return importKind === 'type';})))

        {
          return; // ignore type imports
        }

        var imported = _ExportMap2['default'].get(sourceNode.value, context);

        if (imported == null) {
          return; // no-unresolved territory
        }

        if (imported.path === myPath) {
          return; // no-self-import territory
        }

        var untraversed = [{ mget: function () {function mget() {return imported;}return mget;}(), route: [] }];
        var traversed = new Set();
        function detectCycle(_ref2) {var mget = _ref2.mget,route = _ref2.route;
          var m = mget();
          if (m == null) return;
          if (traversed.has(m.path)) return;
          traversed.add(m.path);var _iteratorNormalCompletion = true;var _didIteratorError = false;var _iteratorError = undefined;try {

            for (var _iterator = m.imports[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {var _ref3 = _step.value;var _ref4 = _slicedToArray(_ref3, 2);var path = _ref4[0];var _ref4$ = _ref4[1];var getter = _ref4$.getter;var declarations = _ref4$.declarations;
              if (traversed.has(path)) continue;
              var toTraverse = [].concat(_toConsumableArray(declarations)).filter(function (_ref5) {var source = _ref5.source,isOnlyImportingTypes = _ref5.isOnlyImportingTypes;return (
                  !ignoreModule(source.value) &&
                  // Ignore only type imports
                  !isOnlyImportingTypes);});


              /*
                                             If cyclic dependency is allowed via dynamic import, skip checking if any module is imported dynamically
                                             */
              if (options.allowUnsafeDynamicCyclicDependency && toTraverse.some(function (d) {return d.dynamic;})) return;

              /*
                                                                                                                           Only report as a cycle if there are any import declarations that are considered by
                                                                                                                           the rule. For example:
                                                                                                                            a.ts:
                                                                                                                           import { foo } from './b' // should not be reported as a cycle
                                                                                                                            b.ts:
                                                                                                                           import type { Bar } from './a'
                                                                                                                           */


              if (path === myPath && toTraverse.length > 0) return true;
              if (route.length + 1 < maxDepth) {var _iteratorNormalCompletion2 = true;var _didIteratorError2 = false;var _iteratorError2 = undefined;try {
                  for (var _iterator2 = toTraverse[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {var _ref6 = _step2.value;var source = _ref6.source;
                    untraversed.push({ mget: getter, route: route.concat(source) });
                  }} catch (err) {_didIteratorError2 = true;_iteratorError2 = err;} finally {try {if (!_iteratorNormalCompletion2 && _iterator2['return']) {_iterator2['return']();}} finally {if (_didIteratorError2) {throw _iteratorError2;}}}
              }
            }} catch (err) {_didIteratorError = true;_iteratorError = err;} finally {try {if (!_iteratorNormalCompletion && _iterator['return']) {_iterator['return']();}} finally {if (_didIteratorError) {throw _iteratorError;}}}
        }

        while (untraversed.length > 0) {
          var next = untraversed.shift(); // bfs!
          if (detectCycle(next)) {
            var message = next.route.length > 0 ? 'Dependency cycle via ' + String(
            routeString(next.route)) :
            'Dependency cycle detected.';
            context.report(importer, message);
            return;
          }
        }
      }

      return (0, _moduleVisitor2['default'])(checkSourceValue, context.options[0]);
    }return create;}() };


function routeString(route) {
  return route.map(function (s) {return String(s.value) + ':' + String(s.loc.start.line);}).join('=>');
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ydWxlcy9uby1jeWNsZS5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnRzIiwibWV0YSIsInR5cGUiLCJkb2NzIiwidXJsIiwic2NoZW1hIiwibWF4RGVwdGgiLCJvbmVPZiIsImRlc2NyaXB0aW9uIiwibWluaW11bSIsImlnbm9yZUV4dGVybmFsIiwiYWxsb3dVbnNhZmVEeW5hbWljQ3ljbGljRGVwZW5kZW5jeSIsImNyZWF0ZSIsImNvbnRleHQiLCJteVBhdGgiLCJnZXRQaHlzaWNhbEZpbGVuYW1lIiwiZ2V0RmlsZW5hbWUiLCJvcHRpb25zIiwiSW5maW5pdHkiLCJpZ25vcmVNb2R1bGUiLCJuYW1lIiwiY2hlY2tTb3VyY2VWYWx1ZSIsInNvdXJjZU5vZGUiLCJpbXBvcnRlciIsInZhbHVlIiwiY2FsbGVlIiwiaW1wb3J0S2luZCIsInNwZWNpZmllcnMiLCJldmVyeSIsImltcG9ydGVkIiwiRXhwb3J0cyIsImdldCIsInBhdGgiLCJ1bnRyYXZlcnNlZCIsIm1nZXQiLCJyb3V0ZSIsInRyYXZlcnNlZCIsIlNldCIsImRldGVjdEN5Y2xlIiwibSIsImhhcyIsImFkZCIsImltcG9ydHMiLCJnZXR0ZXIiLCJkZWNsYXJhdGlvbnMiLCJ0b1RyYXZlcnNlIiwiZmlsdGVyIiwic291cmNlIiwiaXNPbmx5SW1wb3J0aW5nVHlwZXMiLCJzb21lIiwiZCIsImR5bmFtaWMiLCJsZW5ndGgiLCJwdXNoIiwiY29uY2F0IiwibmV4dCIsInNoaWZ0IiwibWVzc2FnZSIsInJvdXRlU3RyaW5nIiwicmVwb3J0IiwibWFwIiwicyIsImxvYyIsInN0YXJ0IiwibGluZSIsImpvaW4iXSwibWFwcGluZ3MiOiJzb0JBQUE7Ozs7O0FBS0Esc0Q7QUFDQSx5QztBQUNBO0FBQ0Esa0U7QUFDQSxxQzs7QUFFQTtBQUNBQSxPQUFPQyxPQUFQLEdBQWlCO0FBQ2ZDLFFBQU07QUFDSkMsVUFBTSxZQURGO0FBRUpDLFVBQU0sRUFBRUMsS0FBSywwQkFBUSxVQUFSLENB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LE1BQVgsR0FBb0IsQ0FBcEI7QUFDV00sd0JBQVlILEtBQUtwQixLQUFqQixDQURYO0FBRWIsd0NBRko7QUFHQXRCLG9CQUFROEMsTUFBUixDQUFlcEMsUUFBZixFQUF5QmtDLE9BQXpCO0FBQ0E7QUFDRDtBQUNGO0FBQ0Y7O0FBRUQsYUFBTyxnQ0FBY3BDLGdCQUFkLEVBQWdDUixRQUFRSSxPQUFSLENBQWdCLENBQWhCLENBQWhDLENBQVA7QUFDRCxLQWpJYyxtQkFBakI7OztBQW9JQSxTQUFTeUMsV0FBVCxDQUFxQnZCLEtBQXJCLEVBQTRCO0FBQzFCLFNBQU9BLE1BQU15QixHQUFOLENBQVUsNEJBQVFDLEVBQUVyQyxLQUFWLGlCQUFtQnFDLEVBQUVDLEdBQUYsQ0FBTUMsS0FBTixDQUFZQyxJQUEvQixHQUFWLEVBQWlEQyxJQUFqRCxDQUFzRCxJQUF0RCxDQUFQO0FBQ0QiLCJmaWxlIjoibm8tY3ljbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlT3ZlcnZpZXcgRW5zdXJlcyB0aGF0IG5vIGltcG9ydGVkIG1vZHVsZSBpbXBvcnRzIHRoZSBsaW50ZWQgbW9kdWxlLlxuICogQGF1dGhvciBCZW4gTW9zaGVyXG4gKi9cblxuaW1wb3J0IHJlc29sdmUgZnJvbSAnZXNsaW50LW1vZHVsZS11dGlscy9yZXNvbHZlJztcbmltcG9ydCBFeHBvcnRzIGZyb20gJy4uL0V4cG9ydE1hcCc7XG5pbXBvcnQgeyBpc0V4dGVybmFsTW9kdWxlIH0gZnJvbSAnLi4vY29yZS9pbXBvcnRUeXBlJztcbmltcG9ydCBtb2R1bGVWaXNpdG9yLCB7IG1ha2VPcHRpb25zU2NoZW1hIH0gZnJvbSAnZXNsaW50LW1vZHVsZS11dGlscy9tb2R1bGVWaXNpdG9yJztcbmltcG9ydCBkb2NzVXJsIGZyb20gJy4uL2RvY3NVcmwnO1xuXG4vLyB0b2RvOiBjYWNoZSBjeWNsZXMgLyBkZWVwIHJlbGF0aW9uc2hpcHMgZm9yIGZhc3RlciByZXBlYXQgZXZhbHVhdGlvblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIG1ldGE6IHtcbiAgICB0eXBlOiAnc3VnZ2VzdGlvbicsXG4gICAgZG9jczogeyB1cmw6IGRvY3NVcmwoJ25vLWN5Y2xlJykgfSxcbiAgICBzY2hlbWE6IFttYWtlT3B0aW9uc1NjaGVtYSh7XG4gICAgICBtYXhEZXB0aDoge1xuICAgICAgICBvbmVPZjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnbWF4aW11bSBkZXBlbmRlbmN5IGRlcHRoIHRvIHRyYXZlcnNlJyxcbiAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgICAgICAgIG1pbmltdW06IDEsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbnVtOiBbJ+KIniddLFxuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICBpZ25vcmVFeHRlcm5hbDoge1xuICAgICAgICBkZXNjcmlwdGlvbjogJ2lnbm9yZSBleHRlcm5hbCBtb2R1bGVzJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0sXG4gICAgICBhbGxvd1Vuc2FmZUR5bmFtaWNDeWNsaWNEZXBlbmRlbmN5OiB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiAnQWxsb3cgY3ljbGljIGRlcGVuZGVuY3kgaWYgdGhlcmUgaXMgYXQgbGVhc3Qgb25lIGR5bmFtaWMgaW1wb3J0IGluIHRoZSBjaGFpbicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9LFxuICAgIH0pXSxcbiAgfSxcblxuICBjcmVhdGUoY29udGV4dCkge1xuICAgIGNvbnN0IG15UGF0aCA9IGNvbnRleHQuZ2V0UGh5c2ljYWxGaWxlbmFtZSA/IGNvbnRleHQuZ2V0UGh5c2ljYWxGaWxlbmFtZSgpIDogY29udGV4dC5nZXRGaWxlbmFtZSgpO1xuICAgIGlmIChteVBhdGggPT09ICc8dGV4dD4nKSByZXR1cm4ge307IC8vIGNhbid0IGN5Y2xlLWNoZWNrIGEgbm9uLWZpbGVcblxuICAgIGNvbnN0IG9wdGlvbnMgPSBjb250ZXh0Lm9wdGlvbnNbMF0gfHwge307XG4gICAgY29uc3QgbWF4RGVwdGggPSB0eXBlb2Ygb3B0aW9ucy5tYXhEZXB0aCA9PT0gJ251bWJlcicgPyBvcHRpb25zLm1heERlcHRoIDogSW5maW5pdHk7XG4gICAgY29uc3QgaWdub3JlTW9kdWxlID0gKG5hbWUpID0+IG9wdGlvbnMuaWdub3JlRXh0ZXJuYWwgJiYgaXNFeHRlcm5hbE1vZHVsZShcbiAgICAgIG5hbWUsXG4gICAgICByZXNvbHZlKG5hbWUsIGNvbnRleHQpLFxuICAgICAgY29udGV4dCxcbiAgICApO1xuXG4gICAgZnVuY3Rpb24gY2hlY2tTb3VyY2VWYWx1ZShzb3VyY2VOb2RlLCBpbXBvcnRlcikge1xuICAgICAgaWYgKGlnbm9yZU1vZHVsZShzb3VyY2VOb2RlLnZhbHVlKSkge1xuICAgICAgICByZXR1cm47IC8vIGlnbm9yZSBleHRlcm5hbCBtb2R1bGVzXG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5hbGxvd1Vuc2FmZUR5bmFtaWNDeWNsaWNEZXBlbmRlbmN5ICYmIChcbiAgICAgICAgLy8gSWdub3JlIGBpbXBvcnQoKWBcbiAgICAgICAgaW1wb3J0ZXIudHlwZSA9PT0gJ0ltcG9ydEV4cHJlc3Npb24nIHx8XG4gICAgICAgIC8vIGByZXF1aXJlKClgIGNhbGxzIGFyZSBhbHdheXMgY2hlY2tlZCAoaWYgcG9zc2libGUpXG4gICAgICAgIChpbXBvcnRlci50eXBlID09PSAnQ2FsbEV4cHJlc3Npb24nICYmIGltcG9ydGVyLmNhbGxlZS5uYW1lICE9PSAncmVxdWlyZScpKSkge1xuICAgICAgICByZXR1cm47IC8vIGN5Y2xlIHZpYSBkeW5hbWljIGltcG9ydCBhbGxvd2VkIGJ5IGNvbmZpZ1xuICAgICAgfVxuXG4gICAgICBpZiAoXG4gICAgICAgIGltcG9ydGVyLnR5cGUgPT09ICdJbXBvcnREZWNsYXJhdGlvbicgJiYgKFxuICAgICAgICAgIC8vIGltcG9ydCB0eXBlIHsgRm9vIH0gKFRTIGFuZCBGbG93KVxuICAgICAgICAgIGltcG9ydGVyLmltcG9ydEtpbmQgPT09ICd0eXBlJyB8fFxuICAgICAgICAgIC8vIGltcG9ydCB7IHR5cGUgRm9vIH0gKEZsb3cpXG4gICAgICAgICAgaW1wb3J0ZXIuc3BlY2lmaWVycy5ldmVyeSgoeyBpbXBvcnRLaW5kIH0pID0+IGltcG9ydEtpbmQgPT09ICd0eXBlJylcbiAgICAgICAgKVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybjsgLy8gaWdub3JlIHR5cGUgaW1wb3J0c1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpbXBvcnRlZCA9IEV4cG9ydHMuZ2V0KHNvdXJjZU5vZGUudmFsdWUsIGNvbnRleHQpO1xuXG4gICAgICBpZiAoaW1wb3J0ZWQgPT0gbnVsbCkge1xuICAgICAgICByZXR1cm47ICAvLyBuby11bnJlc29sdmVkIHRlcnJpdG9yeVxuICAgICAgfVxuXG4gICAgICBpZiAoaW1wb3J0ZWQucGF0aCA9PT0gbXlQYXRoKSB7XG4gICAgICAgIHJldHVybjsgIC8vIG5vLXNlbGYtaW1wb3J0IHRlcnJpdG9yeVxuICAgICAgfVxuXG4gICAgICBjb25zdCB1bnRyYXZlcnNlZCA9IFt7IG1nZXQ6ICgpID0+IGltcG9ydGVkLCByb3V0ZTpbXSB9XTtcbiAgICAgIGNvbnN0IHRyYXZlcnNlZCA9IG5ldyBTZXQoKTtcbiAgICAgIGZ1bmN0aW9uIGRldGVjdEN5Y2xlKHsgbWdldCwgcm91dGUgfSkge1xuICAgICAgICBjb25zdCBtID0gbWdldCgpO1xuICAgICAgICBpZiAobSA9PSBudWxsKSByZXR1cm47XG4gICAgICAgIGlmICh0cmF2ZXJzZWQuaGFzKG0ucGF0aCkpIHJldHVybjtcbiAgICAgICAgdHJhdmVyc2VkLmFkZChtLnBhdGgpO1xuXG4gICAgICAgIGZvciAoY29uc3QgW3BhdGgsIHsgZ2V0dGVyLCBkZWNsYXJhdGlvbnMgfV0gb2YgbS5pbXBvcnRzKSB7XG4gICAgICAgICAgaWYgKHRyYXZlcnNlZC5oYXMocGF0aCkpIGNvbnRpbnVlO1xuICAgICAgICAgIGNvbnN0IHRvVHJhdmVyc2UgPSBbLi4uZGVjbGFyYXRpb25zXS5maWx0ZXIoKHsgc291cmNlLCBpc09ubHlJbXBvcnRpbmdUeXBlcyB9KSA9PlxuICAgICAgICAgICAgIWlnbm9yZU1vZHVsZShzb3VyY2UudmFsdWUpICYmXG4gICAgICAgICAgICAvLyBJZ25vcmUgb25seSB0eXBlIGltcG9ydHNcbiAgICAgICAgICAgICFpc09ubHlJbXBvcnRpbmdUeXBlcyxcbiAgICAgICAgICApO1xuICAgICAgICAgIFxuICAgICAgICAgIC8qXG4gICAgICAgICAgSWYgY3ljbGljIGRlcGVuZGVuY3kgaXMgYWxsb3dlZCB2aWEgZHluYW1pYyBpbXBvcnQsIHNraXAgY2hlY2tpbmcgaWYgYW55IG1vZHVsZSBpcyBpbXBvcnRlZCBkeW5hbWljYWxseVxuICAgICAgICAgICovXG4gICAgICAgICAgaWYgKG9wdGlvbnMuYWxsb3dVbnNhZmVEeW5hbWljQ3ljbGljRGVwZW5kZW5jeSAmJiB0b1RyYXZlcnNlLnNvbWUoZCA9PiBkLmR5bmFtaWMpKSByZXR1cm47XG5cbiAgICAgICAgICAvKlxuICAgICAgICAgIE9ubHkgcmVwb3J0IGFzIGEgY3ljbGUgaWYgdGhlcmUgYXJlIGFueSBpbXBvcnQgZGVjbGFyYXRpb25zIHRoYXQgYXJlIGNvbnNpZGVyZWQgYnlcbiAgICAgICAgICB0aGUgcnVsZS4gRm9yIGV4YW1wbGU6XG5cbiAgICAgICAgICBhLnRzOlxuICAgICAgICAgIGltcG9ydCB7IGZvbyB9IGZyb20gJy4vYicgLy8gc2hvdWxkIG5vdCBiZSByZXBvcnRlZCBhcyBhIGN5Y2xlXG5cbiAgICAgICAgICBiLnRzOlxuICAgICAgICAgIGltcG9ydCB0eXBlIHsgQmFyIH0gZnJvbSAnLi9hJ1xuICAgICAgICAgICovXG4gICAgICAgICAgaWYgKHBhdGggPT09IG15UGF0aCAmJiB0b1RyYXZlcnNlLmxlbmd0aCA+IDApIHJldHVybiB0cnVlO1xuICAgICAgICAgIGlmIChyb3V0ZS5sZW5ndGggKyAxIDwgbWF4RGVwdGgpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgeyBzb3VyY2UgfSBvZiB0b1RyYXZlcnNlKSB7XG4gICAgICAgICAgICAgIHVudHJhdmVyc2VkLnB1c2goeyBtZ2V0OiBnZXR0ZXIsIHJvdXRlOiByb3V0ZS5jb25jYXQoc291cmNlKSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgd2hpbGUgKHVudHJhdmVyc2VkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29uc3QgbmV4dCA9IHVudHJhdmVyc2VkLnNoaWZ0KCk7IC8vIGJmcyFcbiAgICAgICAgaWYgKGRldGVjdEN5Y2xlKG5leHQpKSB7XG4gICAgICAgICAgY29uc3QgbWVzc2FnZSA9IChuZXh0LnJvdXRlLmxlbmd0aCA+IDBcbiAgICAgICAgICAgID8gYERlcGVuZGVuY3kgY3ljbGUgdmlhICR7cm91dGVTdHJpbmcobmV4dC5yb3V0ZSl9YFxuICAgICAgICAgICAgOiAnRGVwZW5kZW5jeSBjeWNsZSBkZXRlY3RlZC4nKTtcbiAgICAgICAgICBjb250ZXh0LnJlcG9ydChpbXBvcnRlciwgbWVzc2FnZSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG1vZHVsZVZpc2l0b3IoY2hlY2tTb3VyY2VWYWx1ZSwgY29udGV4dC5vcHRpb25zWzBdKTtcbiAgfSxcbn07XG5cbmZ1bmN0aW9uIHJvdXRlU3RyaW5nKHJvdXRlKSB7XG4gIHJldHVybiByb3V0ZS5tYXAocyA9PiBgJHtzLnZhbHVlfToke3MubG9jLnN0YXJ0LmxpbmV9YCkuam9pbignPT4nKTtcbn1cbiJdfQ==