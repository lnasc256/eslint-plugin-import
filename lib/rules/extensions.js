'use strict';var _slicedToArray = function () {function sliceIterator(arr, i) {var _arr = [];var _n = true;var _d = false;var _e = undefined;try {for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {_arr.push(_s.value);if (i && _arr.length === i) break;}} catch (err) {_d = true;_e = err;} finally {try {if (!_n && _i["return"]) _i["return"]();} finally {if (_d) throw _e;}}return _arr;}return function (arr, i) {if (Array.isArray(arr)) {return arr;} else if (Symbol.iterator in Object(arr)) {return sliceIterator(arr, i);} else {throw new TypeError("Invalid attempt to destructure non-iterable instance");}};}();var _path = require('path');var _path2 = _interopRequireDefault(_path);

var _resolve = require('eslint-module-utils/resolve');var _resolve2 = _interopRequireDefault(_resolve);
var _importType = require('../core/importType');
var _moduleVisitor = require('eslint-module-utils/moduleVisitor');var _moduleVisitor2 = _interopRequireDefault(_moduleVisitor);
var _docsUrl = require('../docsUrl');var _docsUrl2 = _interopRequireDefault(_docsUrl);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { 'default': obj };}

var enumValues = { 'enum': ['always', 'ignorePackages', 'never'] };
var patternProperties = {
  type: 'object',
  patternProperties: { '.*': enumValues } };

var properties = {
  type: 'object',
  properties: {
    'pattern': patternProperties,
    'ignorePackages': { type: 'boolean' } } };



function buildProperties(context) {

  var result = {
    defaultConfig: 'never',
    pattern: {},
    ignorePackages: false };


  context.options.forEach(function (obj) {

    // If this is a string, set defaultConfig to its value
    if (typeof obj === 'string') {
      result.defaultConfig = obj;
      return;
    }

    // If this is not the new structure, transfer all props to result.pattern
    if (obj.pattern === undefined && obj.ignorePackages === undefined) {
      Object.assign(result.pattern, obj);
      return;
    }

    // If pattern is provided, transfer all props
    if (obj.pattern !== undefined) {
      Object.assign(result.pattern, obj.pattern);
    }

    // If ignorePackages is provided, transfer it to result
    if (obj.ignorePackages !== undefined) {
      result.ignorePackages = obj.ignorePackages;
    }
  });

  if (result.defaultConfig === 'ignorePackages') {
    result.defaultConfig = 'always';
    result.ignorePackages = true;
  }

  return result;
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      url: (0, _docsUrl2['default'])('extensions') },


    schema: {
      anyOf: [
      {
        type: 'array',
        items: [enumValues],
        additionalItems: false },

      {
        type: 'array',
        items: [
        enumValues,
        properties],

        additionalItems: false },

      {
        type: 'array',
        items: [properties],
        additionalItems: false },

      {
        type: 'array',
        items: [patternProperties],
        additionalItems: false },

      {
        type: 'array',
        items: [
        enumValues,
        patternProperties],

        additionalItems: false }] } },





  create: function () {function create(context) {

      var props = buildProperties(context);

      function getModifier(extension) {
        return props.pattern[extension] || props.defaultConfig;
      }

      function isUseOfExtensionRequired(extension, isPackage) {
        return getModifier(extension) === 'always' && (!props.ignorePackages || !isPackage);
      }

      function isUseOfExtensionForbidden(extension) {
        return getModifier(extension) === 'never';
      }

      function isResolvableWithoutExtension(file) {
        var extension = _path2['default'].extname(file);
        var fileWithoutExtension = file.slice(0, -extension.length);
        var resolvedFileWithoutExtension = (0, _resolve2['default'])(fileWithoutExtension, context);

        return resolvedFileWithoutExtension === (0, _resolve2['default'])(file, context);
      }

      function isExternalRootModule(file, context) {
        var slashCount = file.split('/').length - 1;

        if (slashCount === 0) return true;

        /**
                                            * treat custom aliases as internal modules
                                            * Like `import sum from '@src/sum'`
                                            * @link https://www.npmjs.com/package/eslint-import-resolver-alias
                                            * @link https://github.com/import-js/eslint-plugin-import/issues/2365
                                            */
        if (context.settings && context.settings['import/resolver'] && context.settings['import/resolver'].alias) {
          var aliases = void 0;

          if (Array.isArray(context.settings['import/resolver'].alias)) {
            aliases = context.settings['import/resolver'].alias;
          } else if (Array.isArray(context.settings['import/resolver'].alias.map)) {
            aliases = context.settings['import/resolver'].alias.map.map(function (_ref) {var _ref2 = _slicedToArray(_ref, 1),alias = _ref2[0];return alias;});
          } else {
            aliases = [];
          }

          if (aliases.some(function (alias) {return file.startsWith(String(alias) + '/');})) return false;
        }

        if ((0, _importType.isScoped)(file) && slashCount <= 1) return true;
        return false;
      }

      function checkFileExtension(source, node) {
        // bail if the declaration doesn't have a source, e.g. "export { foo };", or if it's only partially typed like in an editor
        if (!source || !source.value) return;

        var importPathWithQueryString = source.value;

        // don't enforce anything on builtins
        if ((0, _importType.isBuiltIn)(importPathWithQueryString, context.settings)) return;

        var importPath = importPathWithQueryString.replace(/\?(.*)$/, '');

        // don't enforce in root external packages as they may have names with `.js`.
        // Like `import Decimal from decimal.js`)
        if (isExternalRootModule(importPath, context)) return;

        var resolvedPath = (0, _resolve2['default'])(importPath, context);

        // get extension from resolved path, if possible.
        // for unresolved, use source value.
        var extension = _path2['default'].extname(resolvedPath || importPath).substring(1);

        // determine if this is a module
        var isPackage = (0, _importType.isExternalModule)(
        importPath,
        (0, _resolve2['default'])(importPath, context),
        context) ||
        (0, _importType.isScoped)(importPath);

        if (!extension || !importPath.endsWith('.' + String(extension))) {
          // ignore type-only imports
          if (node.importKind === 'type') return;
          var extensionRequired = isUseOfExtensionRequired(extension, isPackage);
          var extensionForbidden = isUseOfExtensionForbidden(extension);
          if (extensionRequired && !extensionForbidden) {
            context.report({
              node: source,
              message: 'Missing file extension ' + (
              extension ? '"' + String(extension) + '" ' : '') + 'for "' + String(importPathWithQueryString) + '"' });

          }
        } else if (extension) {
          if (isUseOfExtensionForbidden(extension) && isResolvableWithoutExtension(importPath)) {
            context.report({
              node: source,
              message: 'Unexpected use of file extension "' + String(extension) + '" for "' + String(importPathWithQueryString) + '"' });

          }
        }
      }

      return (0, _moduleVisitor2['default'])(checkFileExtension, { commonjs: true });
    }return create;}() };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ydWxlcy9leHRlbnNpb25zLmpzIl0sIm5hbWVzIjpbImVudW1WYWx1ZXMiLCJwYXR0ZXJuUHJvcGVydGllcyIsInR5cGUiLCJwcm9wZXJ0aWVzIiwiYnVpbGRQcm9wZXJ0aWVzIiwiY29udGV4dCIsInJlc3VsdCIsImRlZmF1bHRDb25maWciLCJwYXR0ZXJuIiwiaWdub3JlUGFja2FnZXMiLCJvcHRpb25zIiwiZm9yRWFjaCIsIm9iaiIsInVuZGVmaW5lZCIsIk9iamVjdCIsImFzc2lnbiIsIm1vZHVsZSIsImV4cG9ydHMiLCJtZXRhIiwiZG9jcyIsInVybCIsInNjaGVtYSIsImFueU9mIiwiaXRlbXMiLCJhZGRpdGlvbmFsSXRlbXMiLCJjcmVhdGUiLCJwcm9wcyIsImdldE1vZGlmaWVyIiwiZXh0ZW5zaW9uIiwiaXNVc2VPZkV4dGVuc2lvblJlcXVpcmVkIiwiaXNQYWNrYWdlIiwiaXNVc2VPZkV4dGVuc2lvbkZvcmJpZGRlbiIsImlzUmVzb2x2YWJsZVdpdGhvdXRFeHRlbnNpb24iLCJmaWxlIiwicGF0aCIsImV4dG5hbWUiLCJmaWxlV2l0aG91dEV4dGVuc2lvbiIsInNsaWNlIiwibGVuZ3RoIiwicmVzb2x2ZWRGaWxlV2l0aG91dEV4dGVuc2lvbiIsImlzRXh0ZXJuYWxSb290TW9kdWxlIiwic2xhc2hDb3VudCIsInNwbGl0Iiwic2V0dGluZ3MiLCJhbGlhcyIsImFsaWFzZXMiLCJBcnJheSIsImlzQXJyYXkiLCJtYXAiLCJzb21lIiwic3RhcnRzV2l0aCIsImNoZWNrRmlsZUV4dGVuc2lvbiIsInNvdXJjZSIsIm5vZGUiLCJ2YWx1ZSIsImltcG9ydFBhdGhXaXRoUXVlcnlTdHJpbmciLCJpbXBvcnRQYXRoIiwicmVwbGFjZSIsInJlc29sdmVkUGF0aCIsInN1YnN0cmluZyIsImVuZHNXaXRoIiwiaW1wb3J0S2luZCIsImV4dGVuc2lvblJlcXVpcmVkIiwiZXh0ZW5zaW9uRm9yYmlkZGVuIiwicmVwb3J0IiwibWVzc2FnZSIsImNv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WTtBQUNoQjBCLGtCQURnQjtBQUVoQixrQ0FBUUEsVUFBUixFQUFvQm5ELE9BQXBCLENBRmdCO0FBR2hCQSxlQUhnQjtBQUliLGtDQUFTbUQsVUFBVCxDQUpMOztBQU1BLFlBQUksQ0FBQzVCLFNBQUQsSUFBYyxDQUFDNEIsV0FBV0ksUUFBWCxjQUF3QmhDLFNBQXhCLEVBQW5CLEVBQXlEO0FBQ3ZEO0FBQ0EsY0FBSXlCLEtBQUtRLFVBQUwsS0FBb0IsTUFBeEIsRUFBZ0M7QUFDaEMsY0FBTUMsb0JBQW9CakMseUJBQXlCRCxTQUF6QixFQUFvQ0UsU0FBcEMsQ0FBMUI7QUFDQSxjQUFNaUMscUJBQXFCaEMsMEJBQTBCSCxTQUExQixDQUEzQjtBQUNBLGNBQUlrQyxxQkFBcUIsQ0FBQ0Msa0JBQTFCLEVBQThDO0FBQzVDMUQsb0JBQVEyRCxNQUFSLENBQWU7QUFDYlgsb0JBQU1ELE1BRE87QUFFYmE7QUFDNEJyQyx1Q0FBZ0JBLFNBQWhCLFdBQWdDLEVBRDVELHFCQUNzRTJCLHlCQUR0RSxPQUZhLEVBQWY7O0FBS0Q7QUFDRixTQVpELE1BWU8sSUFBSTNCLFNBQUosRUFBZTtBQUNwQixjQUFJRywwQkFBMEJILFNBQTFCLEtBQXdDSSw2QkFBNkJ3QixVQUE3QixDQUE1QyxFQUFzRjtBQUNwRm5ELG9CQUFRMkQsTUFBUixDQUFlO0FBQ2JYLG9CQUFNRCxNQURPO0FBRWJhLHFFQUE4Q3JDLFNBQTlDLHVCQUFpRTJCLHlCQUFqRSxPQUZhLEVBQWY7O0FBSUQ7QUFDRjtBQUNGOztBQUVELGFBQU8sZ0NBQWNKLGtCQUFkLEVBQWtDLEVBQUVlLFVBQVUsSUFBWixFQUFsQyxDQUFQO0FBQ0QsS0FwSmMsbUJBQWpCIiwiZmlsZSI6ImV4dGVuc2lvbnMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuaW1wb3J0IHJlc29sdmUgZnJvbSAnZXNsaW50LW1vZHVsZS11dGlscy9yZXNvbHZlJztcbmltcG9ydCB7IGlzQnVpbHRJbiwgaXNFeHRlcm5hbE1vZHVsZSwgaXNTY29wZWQgfSBmcm9tICcuLi9jb3JlL2ltcG9ydFR5cGUnO1xuaW1wb3J0IG1vZHVsZVZpc2l0b3IgZnJvbSAnZXNsaW50LW1vZHVsZS11dGlscy9tb2R1bGVWaXNpdG9yJztcbmltcG9ydCBkb2NzVXJsIGZyb20gJy4uL2RvY3NVcmwnO1xuXG5jb25zdCBlbnVtVmFsdWVzID0geyBlbnVtOiBbICdhbHdheXMnLCAnaWdub3JlUGFja2FnZXMnLCAnbmV2ZXInIF0gfTtcbmNvbnN0IHBhdHRlcm5Qcm9wZXJ0aWVzID0ge1xuICB0eXBlOiAnb2JqZWN0JyxcbiAgcGF0dGVyblByb3BlcnRpZXM6IHsgJy4qJzogZW51bVZhbHVlcyB9LFxufTtcbmNvbnN0IHByb3BlcnRpZXMgPSB7XG4gIHR5cGU6ICdvYmplY3QnLFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgJ3BhdHRlcm4nOiBwYXR0ZXJuUHJvcGVydGllcyxcbiAgICAnaWdub3JlUGFja2FnZXMnOiB7IHR5cGU6ICdib29sZWFuJyB9LFxuICB9LFxufTtcblxuZnVuY3Rpb24gYnVpbGRQcm9wZXJ0aWVzKGNvbnRleHQpIHtcblxuICBjb25zdCByZXN1bHQgPSB7XG4gICAgZGVmYXVsdENvbmZpZzogJ25ldmVyJyxcbiAgICBwYXR0ZXJuOiB7fSxcbiAgICBpZ25vcmVQYWNrYWdlczogZmFsc2UsXG4gIH07XG5cbiAgY29udGV4dC5vcHRpb25zLmZvckVhY2gob2JqID0+IHtcblxuICAgIC8vIElmIHRoaXMgaXMgYSBzdHJpbmcsIHNldCBkZWZhdWx0Q29uZmlnIHRvIGl0cyB2YWx1ZVxuICAgIGlmICh0eXBlb2Ygb2JqID09PSAnc3RyaW5nJykge1xuICAgICAgcmVzdWx0LmRlZmF1bHRDb25maWcgPSBvYmo7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSWYgdGhpcyBpcyBub3QgdGhlIG5ldyBzdHJ1Y3R1cmUsIHRyYW5zZmVyIGFsbCBwcm9wcyB0byByZXN1bHQucGF0dGVyblxuICAgIGlmIChvYmoucGF0dGVybiA9PT0gdW5kZWZpbmVkICYmIG9iai5pZ25vcmVQYWNrYWdlcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBPYmplY3QuYXNzaWduKHJlc3VsdC5wYXR0ZXJuLCBvYmopO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIElmIHBhdHRlcm4gaXMgcHJvdmlkZWQsIHRyYW5zZmVyIGFsbCBwcm9wc1xuICAgIGlmIChvYmoucGF0dGVybiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBPYmplY3QuYXNzaWduKHJlc3VsdC5wYXR0ZXJuLCBvYmoucGF0dGVybik7XG4gICAgfVxuXG4gICAgLy8gSWYgaWdub3JlUGFja2FnZXMgaXMgcHJvdmlkZWQsIHRyYW5zZmVyIGl0IHRvIHJlc3VsdFxuICAgIGlmIChvYmouaWdub3JlUGFja2FnZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmVzdWx0Lmlnbm9yZVBhY2thZ2VzID0gb2JqLmlnbm9yZVBhY2thZ2VzO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKHJlc3VsdC5kZWZhdWx0Q29uZmlnID09PSAnaWdub3JlUGFja2FnZXMnKSB7XG4gICAgcmVzdWx0LmRlZmF1bHRDb25maWcgPSAnYWx3YXlzJztcbiAgICByZXN1bHQuaWdub3JlUGFja2FnZXMgPSB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIG1ldGE6IHtcbiAgICB0eXBlOiAnc3VnZ2VzdGlvbicsXG4gICAgZG9jczoge1xuICAgICAgdXJsOiBkb2NzVXJsKCdleHRlbnNpb25zJyksXG4gICAgfSxcblxuICAgIHNjaGVtYToge1xuICAgICAgYW55T2Y6IFtcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgaXRlbXM6IFtlbnVtVmFsdWVzXSxcbiAgICAgICAgICBhZGRpdGlvbmFsSXRlbXM6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICBpdGVtczogW1xuICAgICAgICAgICAgZW51bVZhbHVlcyxcbiAgICAgICAgICAgIHByb3BlcnRpZXMsXG4gICAgICAgICAgXSxcbiAgICAgICAgICBhZGRpdGlvbmFsSXRlbXM6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICBpdGVtczogW3Byb3BlcnRpZXNdLFxuICAgICAgICAgIGFkZGl0aW9uYWxJdGVtczogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgIGl0ZW1zOiBbcGF0dGVyblByb3BlcnRpZXNdLFxuICAgICAgICAgIGFkZGl0aW9uYWxJdGVtczogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgIGl0ZW1zOiBbXG4gICAgICAgICAgICBlbnVtVmFsdWVzLFxuICAgICAgICAgICAgcGF0dGVyblByb3BlcnRpZXMsXG4gICAgICAgICAgXSxcbiAgICAgICAgICBhZGRpdGlvbmFsSXRlbXM6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9LFxuICB9LFxuXG4gIGNyZWF0ZShjb250ZXh0KSB7XG5cbiAgICBjb25zdCBwcm9wcyA9IGJ1aWxkUHJvcGVydGllcyhjb250ZXh0KTtcblxuICAgIGZ1bmN0aW9uIGdldE1vZGlmaWVyKGV4dGVuc2lvbikge1xuICAgICAgcmV0dXJuIHByb3BzLnBhdHRlcm5bZXh0ZW5zaW9uXSB8fCBwcm9wcy5kZWZhdWx0Q29uZmlnO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzVXNlT2ZFeHRlbnNpb25SZXF1aXJlZChleHRlbnNpb24sIGlzUGFja2FnZSkge1xuICAgICAgcmV0dXJuIGdldE1vZGlmaWVyKGV4dGVuc2lvbikgPT09ICdhbHdheXMnICYmICghcHJvcHMuaWdub3JlUGFja2FnZXMgfHwgIWlzUGFja2FnZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNVc2VPZkV4dGVuc2lvbkZvcmJpZGRlbihleHRlbnNpb24pIHtcbiAgICAgIHJldHVybiBnZXRNb2RpZmllcihleHRlbnNpb24pID09PSAnbmV2ZXInO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzUmVzb2x2YWJsZVdpdGhvdXRFeHRlbnNpb24oZmlsZSkge1xuICAgICAgY29uc3QgZXh0ZW5zaW9uID0gcGF0aC5leHRuYW1lKGZpbGUpO1xuICAgICAgY29uc3QgZmlsZVdpdGhvdXRFeHRlbnNpb24gPSBmaWxlLnNsaWNlKDAsIC1leHRlbnNpb24ubGVuZ3RoKTtcbiAgICAgIGNvbnN0IHJlc29sdmVkRmlsZVdpdGhvdXRFeHRlbnNpb24gPSByZXNvbHZlKGZpbGVXaXRob3V0RXh0ZW5zaW9uLCBjb250ZXh0KTtcblxuICAgICAgcmV0dXJuIHJlc29sdmVkRmlsZVdpdGhvdXRFeHRlbnNpb24gPT09IHJlc29sdmUoZmlsZSwgY29udGV4dCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNFeHRlcm5hbFJvb3RNb2R1bGUoZmlsZSwgY29udGV4dCkge1xuICAgICAgY29uc3Qgc2xhc2hDb3VudCA9IGZpbGUuc3BsaXQoJy8nKS5sZW5ndGggLSAxO1xuXG4gICAgICBpZiAoc2xhc2hDb3VudCA9PT0gMCkgIHJldHVybiB0cnVlO1xuXG4gICAgICAvKipcbiAgICAgICAqIHRyZWF0IGN1c3RvbSBhbGlhc2VzIGFzIGludGVybmFsIG1vZHVsZXNcbiAgICAgICAqIExpa2UgYGltcG9ydCBzdW0gZnJvbSAnQHNyYy9zdW0nYFxuICAgICAgICogQGxpbmsgaHR0cHM6Ly93d3cubnBtanMuY29tL3BhY2thZ2UvZXNsaW50LWltcG9ydC1yZXNvbHZlci1hbGlhc1xuICAgICAgICogQGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL2ltcG9ydC1qcy9lc2xpbnQtcGx1Z2luLWltcG9ydC9pc3N1ZXMvMjM2NVxuICAgICAgICovXG4gICAgICBpZiAoY29udGV4dC5zZXR0aW5ncyAmJiBjb250ZXh0LnNldHRpbmdzWydpbXBvcnQvcmVzb2x2ZXInXSAmJiBjb250ZXh0LnNldHRpbmdzWydpbXBvcnQvcmVzb2x2ZXInXS5hbGlhcykge1xuICAgICAgICBsZXQgYWxpYXNlcztcblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShjb250ZXh0LnNldHRpbmdzWydpbXBvcnQvcmVzb2x2ZXInXS5hbGlhcykpIHtcbiAgICAgICAgICBhbGlhc2VzID0gY29udGV4dC5zZXR0aW5nc1snaW1wb3J0L3Jlc29sdmVyJ10uYWxpYXM7XG4gICAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShjb250ZXh0LnNldHRpbmdzWydpbXBvcnQvcmVzb2x2ZXInXS5hbGlhcy5tYXApKSB7XG4gICAgICAgICAgYWxpYXNlcyA9IGNvbnRleHQuc2V0dGluZ3NbJ2ltcG9ydC9yZXNvbHZlciddLmFsaWFzLm1hcC5tYXAoKFthbGlhc10pID0+IGFsaWFzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhbGlhc2VzID0gW107XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYWxpYXNlcy5zb21lKChhbGlhcykgPT4gZmlsZS5zdGFydHNXaXRoKGAke2FsaWFzfS9gKSkpIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzU2NvcGVkKGZpbGUpICYmIHNsYXNoQ291bnQgPD0gMSkgcmV0dXJuIHRydWU7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hlY2tGaWxlRXh0ZW5zaW9uKHNvdXJjZSwgbm9kZSkge1xuICAgICAgLy8gYmFpbCBpZiB0aGUgZGVjbGFyYXRpb24gZG9lc24ndCBoYXZlIGEgc291cmNlLCBlLmcuIFwiZXhwb3J0IHsgZm9vIH07XCIsIG9yIGlmIGl0J3Mgb25seSBwYXJ0aWFsbHkgdHlwZWQgbGlrZSBpbiBhbiBlZGl0b3JcbiAgICAgIGlmICghc291cmNlIHx8ICFzb3VyY2UudmFsdWUpIHJldHVybjtcbiAgICAgIFxuICAgICAgY29uc3QgaW1wb3J0UGF0aFdpdGhRdWVyeVN0cmluZyA9IHNvdXJjZS52YWx1ZTtcblxuICAgICAgLy8gZG9uJ3QgZW5mb3JjZSBhbnl0aGluZyBvbiBidWlsdGluc1xuICAgICAgaWYgKGlzQnVpbHRJbihpbXBvcnRQYXRoV2l0aFF1ZXJ5U3RyaW5nLCBjb250ZXh0LnNldHRpbmdzKSkgcmV0dXJuO1xuXG4gICAgICBjb25zdCBpbXBvcnRQYXRoID0gaW1wb3J0UGF0aFdpdGhRdWVyeVN0cmluZy5yZXBsYWNlKC9cXD8oLiopJC8sICcnKTtcblxuICAgICAgLy8gZG9uJ3QgZW5mb3JjZSBpbiByb290IGV4dGVybmFsIHBhY2thZ2VzIGFzIHRoZXkgbWF5IGhhdmUgbmFtZXMgd2l0aCBgLmpzYC5cbiAgICAgIC8vIExpa2UgYGltcG9ydCBEZWNpbWFsIGZyb20gZGVjaW1hbC5qc2ApXG4gICAgICBpZiAoaXNFeHRlcm5hbFJvb3RNb2R1bGUoaW1wb3J0UGF0aCwgY29udGV4dCkpIHJldHVybjtcblxuICAgICAgY29uc3QgcmVzb2x2ZWRQYXRoID0gcmVzb2x2ZShpbXBvcnRQYXRoLCBjb250ZXh0KTtcblxuICAgICAgLy8gZ2V0IGV4dGVuc2lvbiBmcm9tIHJlc29sdmVkIHBhdGgsIGlmIHBvc3NpYmxlLlxuICAgICAgLy8gZm9yIHVucmVzb2x2ZWQsIHVzZSBzb3VyY2UgdmFsdWUuXG4gICAgICBjb25zdCBleHRlbnNpb24gPSBwYXRoLmV4dG5hbWUocmVzb2x2ZWRQYXRoIHx8IGltcG9ydFBhdGgpLnN1YnN0cmluZygxKTtcblxuICAgICAgLy8gZGV0ZXJtaW5lIGlmIHRoaXMgaXMgYSBtb2R1bGVcbiAgICAgIGNvbnN0IGlzUGFja2FnZSA9IGlzRXh0ZXJuYWxNb2R1bGUoXG4gICAgICAgIGltcG9ydFBhdGgsXG4gICAgICAgIHJlc29sdmUoaW1wb3J0UGF0aCwgY29udGV4dCksXG4gICAgICAgIGNvbnRleHQsXG4gICAgICApIHx8IGlzU2NvcGVkKGltcG9ydFBhdGgpO1xuXG4gICAgICBpZiAoIWV4dGVuc2lvbiB8fCAhaW1wb3J0UGF0aC5lbmRzV2l0aChgLiR7ZXh0ZW5zaW9ufWApKSB7XG4gICAgICAgIC8vIGlnbm9yZSB0eXBlLW9ubHkgaW1wb3J0c1xuICAgICAgICBpZiAobm9kZS5pbXBvcnRLaW5kID09PSAndHlwZScpIHJldHVybjtcbiAgICAgICAgY29uc3QgZXh0ZW5zaW9uUmVxdWlyZWQgPSBpc1VzZU9mRXh0ZW5zaW9uUmVxdWlyZWQoZXh0ZW5zaW9uLCBpc1BhY2thZ2UpO1xuICAgICAgICBjb25zdCBleHRlbnNpb25Gb3JiaWRkZW4gPSBpc1VzZU9mRXh0ZW5zaW9uRm9yYmlkZGVuKGV4dGVuc2lvbik7XG4gICAgICAgIGlmIChleHRlbnNpb25SZXF1aXJlZCAmJiAhZXh0ZW5zaW9uRm9yYmlkZGVuKSB7XG4gICAgICAgICAgY29udGV4dC5yZXBvcnQoe1xuICAgICAgICAgICAgbm9kZTogc291cmNlLFxuICAgICAgICAgICAgbWVzc2FnZTpcbiAgICAgICAgICAgICAgYE1pc3NpbmcgZmlsZSBleHRlbnNpb24gJHtleHRlbnNpb24gPyBgXCIke2V4dGVuc2lvbn1cIiBgIDogJyd9Zm9yIFwiJHtpbXBvcnRQYXRoV2l0aFF1ZXJ5U3RyaW5nfVwiYCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChleHRlbnNpb24pIHtcbiAgICAgICAgaWYgKGlzVXNlT2ZFeHRlbnNpb25Gb3JiaWRkZW4oZXh0ZW5zaW9uKSAmJiBpc1Jlc29sdmFibGVXaXRob3V0RXh0ZW5zaW9uKGltcG9ydFBhdGgpKSB7XG4gICAgICAgICAgY29udGV4dC5yZXBvcnQoe1xuICAgICAgICAgICAgbm9kZTogc291cmNlLFxuICAgICAgICAgICAgbWVzc2FnZTogYFVuZXhwZWN0ZWQgdXNlIG9mIGZpbGUgZXh0ZW5zaW9uIFwiJHtleHRlbnNpb259XCIgZm9yIFwiJHtpbXBvcnRQYXRoV2l0aFF1ZXJ5U3RyaW5nfVwiYCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBtb2R1bGVWaXNpdG9yKGNoZWNrRmlsZUV4dGVuc2lvbiwgeyBjb21tb25qczogdHJ1ZSB9KTtcbiAgfSxcbn07XG4iXX0=