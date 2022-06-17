'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _createClass = function () {function defineProperties(target, props) {for (var i = 0; i < props.length; i++) {var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);}}return function (Constructor, protoProps, staticProps) {if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;};}();exports.




































































































































































































































































































































































































































































































































































































































































































































































recursivePatternCapture = recursivePatternCapture;var _fs = require('fs');var _fs2 = _interopRequireDefault(_fs);var _path = require('path');var _doctrine = require('doctrine');var _doctrine2 = _interopRequireDefault(_doctrine);var _debug = require('debug');var _debug2 = _interopRequireDefault(_debug);var _eslint = require('eslint');var _parse = require('eslint-module-utils/parse');var _parse2 = _interopRequireDefault(_parse);var _visit = require('eslint-module-utils/visit');var _visit2 = _interopRequireDefault(_visit);var _resolve = require('eslint-module-utils/resolve');var _resolve2 = _interopRequireDefault(_resolve);var _ignore = require('eslint-module-utils/ignore');var _ignore2 = _interopRequireDefault(_ignore);var _hash = require('eslint-module-utils/hash');var _unambiguous = require('eslint-module-utils/unambiguous');var unambiguous = _interopRequireWildcard(_unambiguous);var _tsconfigLoader = require('tsconfig-paths/lib/tsconfig-loader');var _arrayIncludes = require('array-includes');var _arrayIncludes2 = _interopRequireDefault(_arrayIncludes);function _interopRequireWildcard(obj) {if (obj && obj.__esModule) {return obj;} else {var newObj = {};if (obj != null) {for (var key in obj) {if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];}}newObj['default'] = obj;return newObj;}}function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { 'default': obj };}function _classCallCheck(instance, Constructor) {if (!(instance instanceof Constructor)) {throw new TypeError("Cannot call a class as a function");}}var ts = void 0;var log = (0, _debug2['default'])('eslint-plugin-import:ExportMap');var exportCache = new Map();var tsConfigCache = new Map();var ExportMap = function () {function ExportMap(path) {_classCallCheck(this, ExportMap);this.path = path;this.namespace = new Map(); // todo: restructure to key on path, value is resolver + map of names
    this.reexports = new Map(); /**
                                 * star-exports
                                 * @type {Set} of () => ExportMap
                                 */this.dependencies = new Set(); /**
                                                                   * dependencies of this module that are not explicitly re-exported
                                                                   * @type {Map} from path = () => ExportMap
                                                                   */this.imports = new Map();this.errors = []; /**
                                                                                                                 * type {'ambiguous' | 'Module' | 'Script'}
                                                                                                                 */this.parseGoal = 'ambiguous';}_createClass(ExportMap, [{ key: 'has', /**
                                                                                                                                                                                         * Note that this does not check explicitly re-exported names for existence
                                                                                                                                                                                         * in the base namespace, but it will expand all `export * from '...'` exports
                                                                                                                                                                                         * if not found in the explicit namespace.
                                                                                                                                                                                         * @param  {string}  name
                                                                                                                                                                                         * @return {Boolean} true if `name` is exported by this module.
                                                                                                                                                                                         */value: function () {function has(name) {if (this.namespace.has(name)) return true;if (this.reexports.has(name)) return true; // default exports must be explicitly re-exported (#328)
        if (name !== 'default') {var _iteratorNormalCompletion = true;var _didIteratorError = false;var _iteratorError = undefined;try {for (var _iterator = this.dependencies[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {var dep = _step.value;var innerMap = dep(); // todo: report as unresolved?
              if (!innerMap) continue;if (innerMap.has(name)) return true;}} catch (err) {_didIteratorError = true;_iteratorError = err;} finally {try {if (!_iteratorNormalCompletion && _iterator['return']) {_iterator['return']();}} finally {if (_didIteratorError) {throw _iteratorError;}}}}return false;}return has;}() /**
                                                                                                                                                                                                                                                                                                                                 * ensure that imported name fully resolves.
                                                                                                                                                                                                                                                                                                                                 * @param  {string} name
                                                                                                                                                                                                                                                                                                                                 * @return {{ found: boolean, path: ExportMap[] }}
                                                                                                                                                                                                                                                                                                                                 */ }, { key: 'hasDeep', value: function () {function hasDeep(name) {if (this.namespace.has(name)) return { found: true, path: [this] };if (this.reexports.has(name)) {var reexports = this.reexports.get(name);var imported = reexports.getImport(); // if import is ignored, return explicit 'null'
          if (imported == null) return { found: true, path: [this] }; // safeguard against cycles, only if name matches
          if (imported.path === this.path && reexports.local === name) {return { found: false, path: [this] };}var deep = imported.hasDeep(reexports.local);deep.path.unshift(this);return deep;} // default exports must be explicitly re-exported (#328)
        if (name !== 'default') {var _iteratorNormalCompletion2 = true;var _didIteratorError2 = false;var _iteratorError2 = undefined;try {for (var _iterator2 = this.dependencies[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {var dep = _step2.value;var innerMap = dep();if (innerMap == null) return { found: true, path: [this] }; // todo: report as unresolved?
              if (!innerMap) continue; // safeguard against cycles
              if (innerMap.path === this.path) continue;var innerValue = innerMap.hasDeep(name);if (innerValue.found) {innerValue.path.unshift(this);return innerValue;}}} catch (err) {_didIteratorError2 = true;_iteratorError2 = err;} finally {try {if (!_iteratorNormalCompletion2 && _iterator2['return']) {_iterator2['return']();}} finally {if (_didIteratorError2) {throw _iteratorError2;}}}}return { found: false, path: [this] };}return hasDeep;}() }, { key: 'get', value: function () {function get(name) {if (this.namespace.has(name)) return this.namespace.get(name);if (this.reexports.has(name)) {var reexports = this.reexports.get(name);var imported = reexports.getImport(); // if import is ignored, return explicit 'null'
          if (imported == null) return null; // safeguard against cycles, only if name matches
          if (imported.path === this.path && reexports.local === name) return undefined;return imported.get(reexports.local);} // default exports must be explicitly re-exported (#328)
        if (name !== 'default') {var _iteratorNormalCompletion3 = true;var _didIteratorError3 = false;var _iteratorError3 = undefined;try {for (var _iterator3 = this.dependencies[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {var dep = _step3.value;var innerMap = dep(); // todo: report as unresolved?
              if (!innerMap) continue; // safeguard against cycles
              if (innerMap.path === this.path) continue;var innerValue = innerMap.get(name);if (innerValue !== undefined) return innerValue;}} catch (err) {_didIteratorError3 = true;_iteratorError3 = err;} finally {try {if (!_iteratorNormalCompletion3 && _iterator3['return']) {_iterator3['return']();}} finally {if (_didIteratorError3) {throw _iteratorError3;}}}}return undefined;}return get;}() }, { key: 'forEach', value: function () {function forEach(callback, thisArg) {var _this = this;this.namespace.forEach(function (v, n) {return callback.call(thisArg, v, n, _this);});this.reexports.forEach(function (reexports, name) {var reexported = reexports.getImport(); // can't look up meta for ignored re-exports (#348)
          callback.call(thisArg, reexported && reexported.get(reexports.local), name, _this);});this.dependencies.forEach(function (dep) {var d = dep(); // CJS / ignored dependencies won't exist (#717)
          if (d == null) return;d.forEach(function (v, n) {return n !== 'default' && callback.call(thisArg, v, n, _this);});});}return forEach;}() // todo: keys, values, entries?
  }, { key: 'reportErrors', value: function () {function reportErrors(context, declaration) {context.report({ node: declaration.source, message: 'Parse errors in imported module \'' + String(declaration.source.value) + '\': ' + ('' + String(this.errors.map(function (e) {return String(e.message) + ' (' + String(e.lineNumber) + ':' + String(e.column) + ')';}).join(', '))) });}return reportErrors;}() }, { key: 'hasDefault', get: function () {function get() {return this.get('default') != null;}return get;}() // stronger than this.has
  }, { key: 'size', get: function () {function get() {var size = this.namespace.size + this.reexports.size;this.dependencies.forEach(function (dep) {var d = dep(); // CJS / ignored dependencies won't exist (#717)
          if (d == null) return;size += d.size;});return size;}return get;}() }]);return ExportMap;}(); /**
                                                                                                         * parse docs from the first node that has leading comments
                                                                                                         */exports['default'] = ExportMap;function captureDoc(source, docStyleParsers) {var metadata = {}; // 'some' short-circuits on first 'true'
  for (var _len = arguments.length, nodes = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {nodes[_key - 2] = arguments[_key];}nodes.some(function (n) {try {var leadingComments = void 0; // n.leadingComments is legacy `attachComments` behavior
      if ('leadingComments' in n) {leadingComments = n.leadingComments;} else if (n.range) {leadingComments = source.getCommentsBefore(n);}if (!leadingComments || leadingComments.length === 0) return false;for (var name in docStyleParsers) {var doc = docStyleParsers[name](leadingComments);if (doc) {metadata.doc = doc;}}return true;} catch (err) {return false;}});return metadata;}var availableDocStyleParsers = { jsdoc: captureJsDoc, tomdoc: captureTomDoc }; /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                              * parse JSDoc from leading comments
                                                                                                                                                                                                                                                                                                                                                                                                                                                                              * @param {object[]} comments
                                                                                                                                                                                                                                                                                                                                                                                                                                                                              * @return {{ doc: object }}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                              */function captureJsDoc(comments) {var doc = void 0; // capture XSDoc
  comments.forEach(function (comment) {// skip non-block comments
    if (comment.type !== 'Block') return;try {doc = _doctrine2['default'].parse(comment.value, { unwrap: true });} catch (err) {/* don't care, for now? maybe add to `errors?` */}});return doc;} /**
                                                                                                                                                                                                    * parse TomDoc section from comments
                                                                                                                                                                                                    */function captureTomDoc(comments) {// collect lines up to first paragraph break
  var lines = [];for (var i = 0; i < comments.length; i++) {var comment = comments[i];if (comment.value.match(/^\s*$/)) break;lines.push(comment.value.trim());} // return doctrine-like object
  var statusMatch = lines.join(' ').match(/^(Public|Internal|Deprecated):\s*(.+)/);if (statusMatch) {return { description: statusMatch[2], tags: [{ title: statusMatch[1].toLowerCase(), description: statusMatch[2] }] };}}var supportedImportTypes = new Set(['ImportDefaultSpecifier', 'ImportNamespaceSpecifier']);ExportMap.get = function (source, context) {var path = (0, _resolve2['default'])(source, context);if (path == null) return null;return ExportMap['for'](childContext(path, context));};ExportMap['for'] = function (context) {var path = context.path;var cacheKey = (0, _hash.hashObject)(context).digest('hex');var exportMap = exportCache.get(cacheKey); // return cached ignore
  if (exportMap === null) return null;var stats = _fs2['default'].statSync(path);if (exportMap != null) {// date equality check
    if (exportMap.mtime - stats.mtime === 0) {return exportMap;} // future: check content equality?
  } // check valid extensions first
  if (!(0, _ignore.hasValidExtension)(path, context)) {exportCache.set(cacheKey, null);return null;} // check for and cache ignore
  if ((0, _ignore2['default'])(path, context)) {log('ignored path due to ignore settings:', path);exportCache.set(cacheKey, null);return null;}var content = _fs2['default'].readFileSync(path, { encoding: 'utf8' }); // check for and cache unambiguous modules
  if (!unambiguous.test(content)) {log('ignored path due to unambiguous regex:', path);exportCache.set(cacheKey, null);return null;}log('cache miss', cacheKey, 'for path', path);exportMap = ExportMap.parse(path, content, context); // ambiguous modules return null
  if (exportMap == null) return null;exportMap.mtime = stats.mtime;exportCache.set(cacheKey, exportMap);return exportMap;};ExportMap.parse = function (path, content, context) {var m = new ExportMap(path);var isEsModuleInteropTrue = isEsModuleInterop();var ast = void 0;var visitorKeys = void 0;try {var result = (0, _parse2['default'])(path, content, context);ast = result.ast;visitorKeys = result.visitorKeys;} catch (err) {m.errors.push(err);return m; // can't continue
  }m.visitorKeys = visitorKeys;var hasDynamicImports = false;function processDynamicImport(source) {hasDynamicImports = true;if (source.type !== 'Literal') {return null;}var p = remotePath(source.value);if (p == null) {return null;}var importedSpecifiers = new Set();importedSpecifiers.add('ImportNamespaceSpecifier');var getter = thunkFor(p, context);m.imports.set(p, { getter: getter, declarations: new Set([{ source: { // capturing actual node reference holds full AST in memory!
          value: source.value, loc: source.loc }, importedSpecifiers: importedSpecifiers, dynamic: true }]) });}(0, _visit2['default'])(ast, visitorKeys, { ImportExpression: function () {function ImportExpression(node) {processDynamicImport(node.source);}return ImportExpression;}(), CallExpression: function () {function CallExpression(node) {if (node.callee.type === 'Import') {processDynamicImport(node.arguments[0]);}}return CallExpression;}() });var unambiguouslyESM = unambiguous.isModule(ast);if (!unambiguouslyESM && !hasDynamicImports) return null;var docstyle = context.settings && context.settings['import/docstyle'] || ['jsdoc'];var docStyleParsers = {};docstyle.forEach(function (style) {docStyleParsers[style] = availableDocStyleParsers[style];}); // attempt to collect module doc
  if (ast.comments) {ast.comments.some(function (c) {if (c.type !== 'Block') return false;try {var doc = _doctrine2['default'].parse(c.value, { unwrap: true });if (doc.tags.some(function (t) {return t.title === 'module';})) {m.doc = doc;return true;}} catch (err) {/* ignore */}return false;});}var namespaces = new Map();function remotePath(value) {return _resolve2['default'].relative(value, path, context.settings);}function resolveImport(value) {var rp = remotePath(value);if (rp == null) return null;return ExportMap['for'](childContext(rp, context));}function getNamespace(identifier) {if (!namespaces.has(identifier.name)) return;return function () {return resolveImport(namespaces.get(identifier.name));};}function addNamespace(object, identifier) {var nsfn = getNamespace(identifier);if (nsfn) {Object.defineProperty(object, 'namespace', { get: nsfn });}return object;}function processSpecifier(s, n, m) {var nsource = n.source && n.source.value;var exportMeta = {};var local = void 0;switch (s.type) {case 'ExportDefaultSpecifier':if (!nsource) return;local = 'default';break;case 'ExportNamespaceSpecifier':m.namespace.set(s.exported.name, Object.defineProperty(exportMeta, 'namespace', { get: function () {function get() {return resolveImport(nsource);}return get;}() }));return;case 'ExportAllDeclaration':m.namespace.set(s.exported.name || s.exported.value, addNamespace(exportMeta, s.source.value));return;case 'ExportSpecifier':if (!n.source) {m.namespace.set(s.exported.name || s.exported.value, addNamespace(exportMeta, s.local));return;} // else falls through
      default:local = s.local.name;break;} // todo: JSDoc
    m.reexports.set(s.exported.name, { local: local, getImport: function () {function getImport() {return resolveImport(nsource);}return getImport;}() });}function captureDependency(_ref, isOnlyImportingTypes) {var source = _ref.source;var importedSpecifiers = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : new Set();if (source == null) return null;var p = remotePath(source.value);if (p == null) return null;var declarationMetadata = { // capturing actual node reference holds full AST in memory!
      source: { value: source.value, loc: source.loc }, isOnlyImportingTypes: isOnlyImportingTypes, importedSpecifiers: importedSpecifiers };var existing = m.imports.get(p);if (existing != null) {existing.declarations.add(declarationMetadata);return existing.getter;}var getter = thunkFor(p, context);m.imports.set(p, { getter: getter, declarations: new Set([declarationMetadata]) });return getter;}var source = makeSourceCode(content, ast);function readTsConfig() {var tsConfigInfo = (0, _tsconfigLoader.tsConfigLoader)({ cwd: context.parserOptions && context.parserOptions.tsconfigRootDir || process.cwd(), getEnv: function () {function getEnv(key) {return process.env[key];}return getEnv;}() });try {if (tsConfigInfo.tsConfigPath !== undefined) {// Projects not using TypeScript won't have `typescript` installed.
        if (!ts) {ts = require('typescript');}var configFile = ts.readConfigFile(tsConfigInfo.tsConfigPath, ts.sys.readFile);return ts.parseJsonConfigFileContent(configFile.config, ts.sys, (0, _path.dirname)(tsConfigInfo.tsConfigPath));}} catch (e) {// Catch any errors
    }return null;}function isEsModuleInterop() {var cacheKey = (0, _hash.hashObject)({ tsconfigRootDir: context.parserOptions && context.parserOptions.tsconfigRootDir }).digest('hex');var tsConfig = tsConfigCache.get(cacheKey);if (typeof tsConfig === 'undefined') {tsConfig = readTsConfig(context);tsConfigCache.set(cacheKey, tsConfig);}return tsConfig && tsConfig.options ? tsConfig.options.esModuleInterop : false;}ast.body.forEach(function (n) {if (n.type === 'ExportDefaultDeclaration') {var exportMeta = captureDoc(source, docStyleParsers, n);if (n.declaration.type === 'Identifier') {addNamespace(exportMeta, n.declaration);}m.namespace.set('default', exportMeta);return;}if (n.type === 'ExportAllDeclaration') {var getter = captureDependency(n, n.exportKind === 'type');if (getter) m.dependencies.add(getter);if (n.exported) {processSpecifier(n, n.exported, m);}return;} // capture namespaces in case of later export
    if (n.type === 'ImportDeclaration') {// import type { Foo } (TS and Flow)
      var declarationIsType = n.importKind === 'type'; // import './foo' or import {} from './foo' (both 0 specifiers) is a side effect and
      // shouldn't be considered to be just importing types
      var specifiersOnlyImportingTypes = n.specifiers.length;var importedSpecifiers = new Set();n.specifiers.forEach(function (specifier) {if (supportedImportTypes.has(specifier.type)) {importedSpecifiers.add(specifier.type);}if (specifier.type === 'ImportSpecifier') {importedSpecifiers.add(specifier.imported.name || specifier.imported.value);} // import { type Foo } (Flow)
        specifiersOnlyImportingTypes = specifiersOnlyImportingTypes && specifier.importKind === 'type';});captureDependency(n, declarationIsType || specifiersOnlyImportingTypes, importedSpecifiers);var ns = n.specifiers.find(function (s) {return s.type === 'ImportNamespaceSpecifier';});if (ns) {namespaces.set(ns.local.name, n.source.value);}return;}if (n.type === 'ExportNamedDeclaration') {// capture declaration
      if (n.declaration != null) {switch (n.declaration.type) {case 'FunctionDeclaration':case 'ClassDeclaration':case 'TypeAlias': // flowtype with babel-eslint parser
          case 'InterfaceDeclaration':case 'DeclareFunction':case 'TSDeclareFunction':case 'TSEnumDeclaration':case 'TSTypeAliasDeclaration':case 'TSInterfaceDeclaration':case 'TSAbstractClassDeclaration':case 'TSModuleDeclaration':m.namespace.set(n.declaration.id.name, captureDoc(source, docStyleParsers, n));break;case 'VariableDeclaration':n.declaration.declarations.forEach(function (d) {return recursivePatternCapture(d.id, function (id) {return m.namespace.set(id.name, captureDoc(source, docStyleParsers, d, n));});});break;}}n.specifiers.forEach(function (s) {return processSpecifier(s, n, m);});}var exports = ['TSExportAssignment'];if (isEsModuleInteropTrue) {exports.push('TSNamespaceExportDeclaration');} // This doesn't declare anything, but changes what's being exported.
    if ((0, _arrayIncludes2['default'])(exports, n.type)) {var exportedName = n.type === 'TSNamespaceExportDeclaration' ? (n.id || n.name).name : n.expression && n.expression.name || n.expression.id && n.expression.id.name || null;var declTypes = ['VariableDeclaration', 'ClassDeclaration', 'TSDeclareFunction', 'TSEnumDeclaration', 'TSTypeAliasDeclaration', 'TSInterfaceDeclaration', 'TSAbstractClassDeclaration', 'TSModuleDeclaration'];var exportedDecls = ast.body.filter(function (_ref2) {var type = _ref2.type,id = _ref2.id,declarations = _ref2.declarations;return (0, _arrayIncludes2['default'])(declTypes, type) && (id && id.name === exportedName || declarations && declarations.find(function (d) {return d.id.name === exportedName;}));});if (exportedDecls.length === 0) {// Export is not referencing any local declaration, must be re-exporting
        m.namespace.set('default', captureDoc(source, docStyleParsers, n));return;}if (isEsModuleInteropTrue // esModuleInterop is on in tsconfig
      && !m.namespace.has('default') // and default isn't added already
      ) {m.namespace.set('default', {}); // add default export
        }exportedDecls.forEach(function (decl) {if (decl.type === 'TSModuleDeclaration') {if (decl.body && decl.body.type === 'TSModuleDeclaration') {m.namespace.set(decl.body.id.name, captureDoc(source, docStyleParsers, decl.body));} else if (decl.body && decl.body.body) {decl.body.body.forEach(function (moduleBlockNode) {// Export-assignment exports all members in the namespace,
              // explicitly exported or not.
              var namespaceDecl = moduleBlockNode.type === 'ExportNamedDeclaration' ? moduleBlockNode.declaration : moduleBlockNode;if (!namespaceDecl) {// TypeScript can check this for us; we needn't
              } else if (namespaceDecl.type === 'VariableDeclaration') {namespaceDecl.declarations.forEach(function (d) {return recursivePatternCapture(d.id, function (id) {return m.namespace.set(id.name, captureDoc(source, docStyleParsers, decl, namespaceDecl, moduleBlockNode));});});} else {m.namespace.set(namespaceDecl.id.name, captureDoc(source, docStyleParsers, moduleBlockNode));}});}} else {// Export as default
          m.namespace.set('default', captureDoc(source, docStyleParsers, decl));}});}});if (isEsModuleInteropTrue // esModuleInterop is on in tsconfig
  && m.namespace.size > 0 // anything is exported
  && !m.namespace.has('default') // and default isn't added already
  ) {m.namespace.set('default', {}); // add default export
    }if (unambiguouslyESM) {m.parseGoal = 'Module';}return m;}; /**
                                                                 * The creation of this closure is isolated from other scopes
                                                                 * to avoid over-retention of unrelated variables, which has
                                                                 * caused memory leaks. See #1266.
                                                                 */function thunkFor(p, context) {return function () {return ExportMap['for'](childContext(p, context));};} /**
                                                                                                                                                                             * Traverse a pattern/identifier node, calling 'callback'
                                                                                                                                                                             * for each leaf identifier.
                                                                                                                                                                             * @param  {node}   pattern
                                                                                                                                                                             * @param  {Function} callback
                                                                                                                                                                             * @return {void}
                                                                                                                                                                             */function recursivePatternCapture(pattern, callback) {switch (pattern.type) {case 'Identifier': // base case
      callback(pattern);break;case 'ObjectPattern':pattern.properties.forEach(function (p) {if (p.type === 'ExperimentalRestProperty' || p.type === 'RestElement') {callback(p.argument);return;}recursivePatternCapture(p.value, callback);});break;case 'ArrayPattern':pattern.elements.forEach(function (element) {if (element == null) return;if (element.type === 'ExperimentalRestProperty' || element.type === 'RestElement') {callback(element.argument);return;}recursivePatternCapture(element, callback);});break;case 'AssignmentPattern':callback(pattern.left);break;}} /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       * don't hold full context object in memory, just grab what we need.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       */function childContext(path, context) {var settings = context.settings,parserOptions = context.parserOptions,parserPath = context.parserPath;return { settings: settings, parserOptions: parserOptions, parserPath: parserPath, path: path };} /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        * sometimes legacy support isn't _that_ hard... right?
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        */function makeSourceCode(text, ast) {if (_eslint.SourceCode.length > 1) {// ESLint 3
    return new _eslint.SourceCode(text, ast);} else {// ESLint 4, 5
    return new _eslint.SourceCode({ text: text, ast: ast });}}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9FeHBvcnRNYXAuanMiXSwibmFtZXMiOlsicmVjdXJzaXZlUGF0dGVybkNhcHR1cmUiLCJ1bmFtYmlndW91cyIsInRzIiwibG9nIiwiZXhwb3J0Q2FjaGUiLCJNYXAiLCJ0c0NvbmZpZ0NhY2hlIiwiRXhwb3J0TWFwIiwicGF0aCIsIm5hbWVzcGFjZSIsInJlZXhwb3J0cyIsImRlcGVuZGVuY2llcyIsIlNldCIsImltcG9ydHMiLCJlcnJvcnMiLCJwYXJzZUdvYWwiLCJuYW1lIiwiaGFzIiwiZGVwIiwiaW5uZXJNYXAiLCJmb3VuZCIsImdldCIsImltcG9ydGVkIiwiZ2V0SW1wb3J0IiwibG9jYWwiLCJkZWVwIiwiaGFzRGVlcCIsInVuc2hpZnQiLCJpbm5lclZhbHVlIiwidW5kZWZpbmVkIiwiY2FsbGJhY2siLCJ0aGlzQXJnIiwiZm9yRWFjaCIsInYiLCJuIiwiY2FsbCIsInJlZXhwb3J0ZWQiLCJkIiwiY29udGV4dCIsImRlY2xhcmF0aW9uIiwicmVwb3J0Iiwibm9kZSIsInNvdXJjZSIsIm1lc3NhZ2UiLCJ2YWx1ZSIsIm1hcCIsImUiLCJsaW5lTnVtYmVyIiwiY29sdW1uIiwiam9pbiIsInNpemUiLCJjYXB0dXJlRG9jIiwiZG9jU3R5bGVQYXJzZXJzIiwibWV0YWRhdGEiLCJub2RlcyIsInNvbWUiLCJsZWFkaW5nQ29tbWVudHMiLCJyYW5nZSIsImdldENvbW1lbnRzQmVmb3JlIiwibGVuZ3RoIiwiZG9jIiwiZXJyIiwiYXZhaWxhYmxlRG9jU3R5bGVQYXJzZXJzIiwianNkb2MiLCJjYXB0dXJlSnNEb2MiLCJ0b21kb2MiLCJjYXB0dXJlVG9tRG9jIiwiY29tbWVudHMiLCJjb21tZW50IiwidHlwZSIsImRvY3RyaW5lIiwicGFyc2UiLCJ1bndyYXAiLCJsaW5lcyIsImkiLCJtYXRjaCIsInB1c2giLCJ0cmltIiwic3RhdHVzTWF0Y2giLCJkZXNjcmlwdGlvbiIsInRhZ3MiLCJ0aXRsZSIsInRvTG93ZXJDYXNlIiwic3VwcG9ydGVkSW1wb3J0VHlwZXMiLCJjaGlsZENvbnRleHQiLCJjYWNoZUtleSIsImRpZ2VzdCIsImV4cG9ydE1hcCIsInN0YXRzIiwiZnMiLCJzdGF0U3luYyIsIm10aW1lIiwic2V0IiwiY29udGVudCIsInJlYWRGaWxlU3luYyIsImVuY29kaW5nIiwidGVzdCIsIm0iLCJpc0VzTW9kdWxlSW50ZXJvcFRydWUiLCJpc0VzTW9kdWxlSW50ZXJvcCIsImFzdCIsInZpc2l0b3JLZXlzIiwicmVzdWx0IiwiaGFzRHluYW1pY0ltcG9ydHMiLCJwcm9jZXNzRHluYW1pY0ltcG9ydCIsInAiLCJyZW1vdGVQYXRoIiwiaW1wb3J0ZWRTcGVjaWZpZXJzIiwiYWRkIiwiZ2V0dGVyIiwidGh1bmtGb3IiLCJkZWNsYXJhdGlvbnMiLCJsb2MiLCJkeW5hbWljIiwiSW1wb3J0RXhwcmVzc2lvbiIsIkNhbGxFeHByZXNzaW9uIiwiY2FsbGVlIiwiYXJndW1lbnRzIiwidW5hbWJpZ3VvdXNseUVTTSIsImlzTW9kdWxlIiwiZG9jc3R5bGUiLCJzZXR0aW5ncyIsInN0eWxlIiwiYyIsInQiLCJuYW1lc3BhY2VzIiwicmVzb2x2ZSIsInJlbGF0aXZlIiwicmVzb2x2ZUltcG9ydCIsInJwIiwiZ2V0TmFtZXNwYWNlIiwiaWRlbnRpZmllciIsImFkZE5hbWVzcGFjZSIsIm9iamVjdCIsIm5zZm4iLCJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsInByb2Nlc3NTcGVjaWZpZXIiLCJzIiwibnNvdXJjZSIsImV4cG9ydE1ldGEiLCJleHBvcnRlZCIsImNhcHR1cmVEZXBlbmRlbmN5IiwiaXNPbmx5SW1wb3J0aW5nVHlwZXMiLCJkZWNsYXJhdGlvbk1ldGFkYXRhIiwiZXhpc3RpbmciLCJtYWtlU291cmNlQ29kZSIsInJlYWRUc0NvbmZpZyIsInRzQ29uZmlnSW5mbyIsImN3ZCIsInBhcnNlck9wdGlvbnMiLCJ0c2NvbmZpZ1Jvb3REaXIiLCJwcm9jZXNzIiwiZ2V0RW52Iiwia2V5IiwiZW52IiwidHNDb25maWdQYXRoIiwicmVxdWlyZSIsImNvbmZpZ0ZpbGUiLCJyZWFkQ29uZmlnRmlsZSIsInN5cyIsInJlYWRGaWxlIiwicGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQiLCJjb25maWciLCJ0c0NvbmZpZyIsIm9wdGlvbnMiLCJlc01vZHVsZUludGVyb3AiLCJib2R5IiwiZXhwb3J0S2luZCIsImRlY2xhcmF0aW9uSXNUeXBlIiwiaW1wb3J0S2luZCIsInNwZWNpZmllcnNPbmx5SW1wb3J0aW5nVHlwZXMiLCJzcGVjaWZpZXJzIiwic3BlY2lmaWVyIiwibnMiLCJmaW5kIiwiaWQiLCJleHBvcnRzIiwiZXhwb3J0ZWROYW1lIiwiZXhwcmVzc2lvbiIsImRlY2xUeXBlcyIsImV4cG9ydGVkRGVjbHMiLCJmaWx0ZXIiLCJkZWNsIiwibW9kdWxlQmxvY2tOb2RlIiwibmFtZXNwYWNlRGVjbCIsInBhdHRlcm4iLCJwcm9wZXJ0aWVzIiwiYXJndW1lbnQiLCJlbGVtZW50cyIsImVsZW1lbnQiLCJsZWZ0IiwicGFyc2VyUGF0aCIsInRleHQiLCJTb3VyY2VDb2RlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7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Q0FDakJnSCxhQURpQixDQUNGMEMsVUFERSxHQUNhMUosT0FEYixDQUNGMEosVUFERSxDQUVuQyxPQUFPLEVBQ0x2RSxrQkFESyxFQUVMNkIsNEJBRkssRUFHTDBDLHNCQUhLLEVBSUx4TCxVQUpLLEVBQVAsQ0FNRCxDLENBR0Q7OzB5QkFHQSxTQUFTMEksY0FBVCxDQUF3QitDLElBQXhCLEVBQThCN0YsR0FBOUIsRUFBbUMsQ0FDakMsSUFBSThGLG1CQUFXdkksTUFBWCxHQUFvQixDQUF4QixFQUEyQixDQUN6QjtBQUNBLFdBQU8sSUFBSXVJLGtCQUFKLENBQWVELElBQWYsRUFBcUI3RixHQUFyQixDQUFQLENBQ0QsQ0FIRCxNQUdPLENBQ0w7QUFDQSxXQUFPLElBQUk4RixrQkFBSixDQUFlLEVBQUVELFVBQUYsRUFBUTdGLFFBQVIsRUFBZixDQUFQLENBQ0QsQ0FDRiIsImZpbGUiOiJFeHBvcnRNYXAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHsgZGlybmFtZSB9IGZyb20gJ3BhdGgnO1xuXG5pbXBvcnQgZG9jdHJpbmUgZnJvbSAnZG9jdHJpbmUnO1xuXG5pbXBvcnQgZGVidWcgZnJvbSAnZGVidWcnO1xuXG5pbXBvcnQgeyBTb3VyY2VDb2RlIH0gZnJvbSAnZXNsaW50JztcblxuaW1wb3J0IHBhcnNlIGZyb20gJ2VzbGludC1tb2R1bGUtdXRpbHMvcGFyc2UnO1xuaW1wb3J0IHZpc2l0IGZyb20gJ2VzbGludC1tb2R1bGUtdXRpbHMvdmlzaXQnO1xuaW1wb3J0IHJlc29sdmUgZnJvbSAnZXNsaW50LW1vZHVsZS11dGlscy9yZXNvbHZlJztcbmltcG9ydCBpc0lnbm9yZWQsIHsgaGFzVmFsaWRFeHRlbnNpb24gfSBmcm9tICdlc2xpbnQtbW9kdWxlLXV0aWxzL2lnbm9yZSc7XG5cbmltcG9ydCB7IGhhc2hPYmplY3QgfSBmcm9tICdlc2xpbnQtbW9kdWxlLXV0aWxzL2hhc2gnO1xuaW1wb3J0ICogYXMgdW5hbWJpZ3VvdXMgZnJvbSAnZXNsaW50LW1vZHVsZS11dGlscy91bmFtYmlndW91cyc7XG5cbmltcG9ydCB7IHRzQ29uZmlnTG9hZGVyIH0gZnJvbSAndHNjb25maWctcGF0aHMvbGliL3RzY29uZmlnLWxvYWRlcic7XG5cbmltcG9ydCBpbmNsdWRlcyBmcm9tICdhcnJheS1pbmNsdWRlcyc7XG5cbmxldCB0cztcblxuY29uc3QgbG9nID0gZGVidWcoJ2VzbGludC1wbHVnaW4taW1wb3J0OkV4cG9ydE1hcCcpO1xuXG5jb25zdCBleHBvcnRDYWNoZSA9IG5ldyBNYXAoKTtcbmNvbnN0IHRzQ29uZmlnQ2FjaGUgPSBuZXcgTWFwKCk7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEV4cG9ydE1hcCB7XG4gIGNvbnN0cnVjdG9yKHBhdGgpIHtcbiAgICB0aGlzLnBhdGggPSBwYXRoO1xuICAgIHRoaXMubmFtZXNwYWNlID0gbmV3IE1hcCgpO1xuICAgIC8vIHRvZG86IHJlc3RydWN0dXJlIHRvIGtleSBvbiBwYXRoLCB2YWx1ZSBpcyByZXNvbHZlciArIG1hcCBvZiBuYW1lc1xuICAgIHRoaXMucmVleHBvcnRzID0gbmV3IE1hcCgpO1xuICAgIC8qKlxuICAgICAqIHN0YXItZXhwb3J0c1xuICAgICAqIEB0eXBlIHtTZXR9IG9mICgpID0+IEV4cG9ydE1hcFxuICAgICAqL1xuICAgIHRoaXMuZGVwZW5kZW5jaWVzID0gbmV3IFNldCgpO1xuICAgIC8qKlxuICAgICAqIGRlcGVuZGVuY2llcyBvZiB0aGlzIG1vZHVsZSB0aGF0IGFyZSBub3QgZXhwbGljaXRseSByZS1leHBvcnRlZFxuICAgICAqIEB0eXBlIHtNYXB9IGZyb20gcGF0aCA9ICgpID0+IEV4cG9ydE1hcFxuICAgICAqL1xuICAgIHRoaXMuaW1wb3J0cyA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLmVycm9ycyA9IFtdO1xuICAgIC8qKlxuICAgICAqIHR5cGUgeydhbWJpZ3VvdXMnIHwgJ01vZHVsZScgfCAnU2NyaXB0J31cbiAgICAgKi9cbiAgICB0aGlzLnBhcnNlR29hbCA9ICdhbWJpZ3VvdXMnO1xuICB9XG5cbiAgZ2V0IGhhc0RlZmF1bHQoKSB7IHJldHVybiB0aGlzLmdldCgnZGVmYXVsdCcpICE9IG51bGw7IH0gLy8gc3Ryb25nZXIgdGhhbiB0aGlzLmhhc1xuXG4gIGdldCBzaXplKCkge1xuICAgIGxldCBzaXplID0gdGhpcy5uYW1lc3BhY2Uuc2l6ZSArIHRoaXMucmVleHBvcnRzLnNpemU7XG4gICAgdGhpcy5kZXBlbmRlbmNpZXMuZm9yRWFjaChkZXAgPT4ge1xuICAgICAgY29uc3QgZCA9IGRlcCgpO1xuICAgICAgLy8gQ0pTIC8gaWdub3JlZCBkZXBlbmRlbmNpZXMgd29uJ3QgZXhpc3QgKCM3MTcpXG4gICAgICBpZiAoZCA9PSBudWxsKSByZXR1cm47XG4gICAgICBzaXplICs9IGQuc2l6ZTtcbiAgICB9KTtcbiAgICByZXR1cm4gc2l6ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOb3RlIHRoYXQgdGhpcyBkb2VzIG5vdCBjaGVjayBleHBsaWNpdGx5IHJlLWV4cG9ydGVkIG5hbWVzIGZvciBleGlzdGVuY2VcbiAgICogaW4gdGhlIGJhc2UgbmFtZXNwYWNlLCBidXQgaXQgd2lsbCBleHBhbmQgYWxsIGBleHBvcnQgKiBmcm9tICcuLi4nYCBleHBvcnRzXG4gICAqIGlmIG5vdCBmb3VuZCBpbiB0aGUgZXhwbGljaXQgbmFtZXNwYWNlLlxuICAgKiBAcGFyYW0gIHtzdHJpbmd9ICBuYW1lXG4gICAqIEByZXR1cm4ge0Jvb2xlYW59IHRydWUgaWYgYG5hbWVgIGlzIGV4cG9ydGVkIGJ5IHRoaXMgbW9kdWxlLlxuICAgKi9cbiAgaGFzKG5hbWUpIHtcbiAgICBpZiAodGhpcy5uYW1lc3BhY2UuaGFzKG5hbWUpKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAodGhpcy5yZWV4cG9ydHMuaGFzKG5hbWUpKSByZXR1cm4gdHJ1ZTtcblxuICAgIC8vIGRlZmF1bHQgZXhwb3J0cyBtdXN0IGJlIGV4cGxpY2l0bHkgcmUtZXhwb3J0ZWQgKCMzMjgpXG4gICAgaWYgKG5hbWUgIT09ICdkZWZhdWx0Jykge1xuICAgICAgZm9yIChjb25zdCBkZXAgb2YgdGhpcy5kZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgY29uc3QgaW5uZXJNYXAgPSBkZXAoKTtcblxuICAgICAgICAvLyB0b2RvOiByZXBvcnQgYXMgdW5yZXNvbHZlZD9cbiAgICAgICAgaWYgKCFpbm5lck1hcCkgY29udGludWU7XG5cbiAgICAgICAgaWYgKGlubmVyTWFwLmhhcyhuYW1lKSkgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIGVuc3VyZSB0aGF0IGltcG9ydGVkIG5hbWUgZnVsbHkgcmVzb2x2ZXMuXG4gICAqIEBwYXJhbSAge3N0cmluZ30gbmFtZVxuICAgKiBAcmV0dXJuIHt7IGZvdW5kOiBib29sZWFuLCBwYXRoOiBFeHBvcnRNYXBbXSB9fVxuICAgKi9cbiAgaGFzRGVlcChuYW1lKSB7XG4gICAgaWYgKHRoaXMubmFtZXNwYWNlLmhhcyhuYW1lKSkgcmV0dXJuIHsgZm91bmQ6IHRydWUsIHBhdGg6IFt0aGlzXSB9O1xuXG4gICAgaWYgKHRoaXMucmVleHBvcnRzLmhhcyhuYW1lKSkge1xuICAgICAgY29uc3QgcmVleHBvcnRzID0gdGhpcy5yZWV4cG9ydHMuZ2V0KG5hbWUpO1xuICAgICAgY29uc3QgaW1wb3J0ZWQgPSByZWV4cG9ydHMuZ2V0SW1wb3J0KCk7XG5cbiAgICAgIC8vIGlmIGltcG9ydCBpcyBpZ25vcmVkLCByZXR1cm4gZXhwbGljaXQgJ251bGwnXG4gICAgICBpZiAoaW1wb3J0ZWQgPT0gbnVsbCkgcmV0dXJuIHsgZm91bmQ6IHRydWUsIHBhdGg6IFt0aGlzXSB9O1xuXG4gICAgICAvLyBzYWZlZ3VhcmQgYWdhaW5zdCBjeWNsZXMsIG9ubHkgaWYgbmFtZSBtYXRjaGVzXG4gICAgICBpZiAoaW1wb3J0ZWQucGF0aCA9PT0gdGhpcy5wYXRoICYmIHJlZXhwb3J0cy5sb2NhbCA9PT0gbmFtZSkge1xuICAgICAgICByZXR1cm4geyBmb3VuZDogZmFsc2UsIHBhdGg6IFt0aGlzXSB9O1xuICAgICAgfVxuXG4gICAgICBjb25zdCBkZWVwID0gaW1wb3J0ZWQuaGFzRGVlcChyZWV4cG9ydHMubG9jYWwpO1xuICAgICAgZGVlcC5wYXRoLnVuc2hpZnQodGhpcyk7XG5cbiAgICAgIHJldHVybiBkZWVwO1xuICAgIH1cblxuXG4gICAgLy8gZGVmYXVsdCBleHBvcnRzIG11c3QgYmUgZXhwbGljaXRseSByZS1leHBvcnRlZCAoIzMyOClcbiAgICBpZiAobmFtZSAhPT0gJ2RlZmF1bHQnKSB7XG4gICAgICBmb3IgKGNvbnN0IGRlcCBvZiB0aGlzLmRlcGVuZGVuY2llcykge1xuICAgICAgICBjb25zdCBpbm5lck1hcCA9IGRlcCgpO1xuICAgICAgICBpZiAoaW5uZXJNYXAgPT0gbnVsbCkgcmV0dXJuIHsgZm91bmQ6IHRydWUsIHBhdGg6IFt0aGlzXSB9O1xuICAgICAgICAvLyB0b2RvOiByZXBvcnQgYXMgdW5yZXNvbHZlZD9cbiAgICAgICAgaWYgKCFpbm5lck1hcCkgY29udGludWU7XG5cbiAgICAgICAgLy8gc2FmZWd1YXJkIGFnYWluc3QgY3ljbGVzXG4gICAgICAgIGlmIChpbm5lck1hcC5wYXRoID09PSB0aGlzLnBhdGgpIGNvbnRpbnVlO1xuXG4gICAgICAgIGNvbnN0IGlubmVyVmFsdWUgPSBpbm5lck1hcC5oYXNEZWVwKG5hbWUpO1xuICAgICAgICBpZiAoaW5uZXJWYWx1ZS5mb3VuZCkge1xuICAgICAgICAgIGlubmVyVmFsdWUucGF0aC51bnNoaWZ0KHRoaXMpO1xuICAgICAgICAgIHJldHVybiBpbm5lclZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgZm91bmQ6IGZhbHNlLCBwYXRoOiBbdGhpc10gfTtcbiAgfVxuXG4gIGdldChuYW1lKSB7XG4gICAgaWYgKHRoaXMubmFtZXNwYWNlLmhhcyhuYW1lKSkgcmV0dXJuIHRoaXMubmFtZXNwYWNlLmdldChuYW1lKTtcblxuICAgIGlmICh0aGlzLnJlZXhwb3J0cy5oYXMobmFtZSkpIHtcbiAgICAgIGNvbnN0IHJlZXhwb3J0cyA9IHRoaXMucmVleHBvcnRzLmdldChuYW1lKTtcbiAgICAgIGNvbnN0IGltcG9ydGVkID0gcmVleHBvcnRzLmdldEltcG9ydCgpO1xuXG4gICAgICAvLyBpZiBpbXBvcnQgaXMgaWdub3JlZCwgcmV0dXJuIGV4cGxpY2l0ICdudWxsJ1xuICAgICAgaWYgKGltcG9ydGVkID09IG51bGwpIHJldHVybiBudWxsO1xuXG4gICAgICAvLyBzYWZlZ3VhcmQgYWdhaW5zdCBjeWNsZXMsIG9ubHkgaWYgbmFtZSBtYXRjaGVzXG4gICAgICBpZiAoaW1wb3J0ZWQucGF0aCA9PT0gdGhpcy5wYXRoICYmIHJlZXhwb3J0cy5sb2NhbCA9PT0gbmFtZSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgICAgcmV0dXJuIGltcG9ydGVkLmdldChyZWV4cG9ydHMubG9jYWwpO1xuICAgIH1cblxuICAgIC8vIGRlZmF1bHQgZXhwb3J0cyBtdXN0IGJlIGV4cGxpY2l0bHkgcmUtZXhwb3J0ZWQgKCMzMjgpXG4gICAgaWYgKG5hbWUgIT09ICdkZWZhdWx0Jykge1xuICAgICAgZm9yIChjb25zdCBkZXAgb2YgdGhpcy5kZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgY29uc3QgaW5uZXJNYXAgPSBkZXAoKTtcbiAgICAgICAgLy8gdG9kbzogcmVwb3J0IGFzIHVucmVzb2x2ZWQ/XG4gICAgICAgIGlmICghaW5uZXJNYXApIGNvbnRpbnVlO1xuXG4gICAgICAgIC8vIHNhZmVndWFyZCBhZ2FpbnN0IGN5Y2xlc1xuICAgICAgICBpZiAoaW5uZXJNYXAucGF0aCA9PT0gdGhpcy5wYXRoKSBjb250aW51ZTtcblxuICAgICAgICBjb25zdCBpbm5lclZhbHVlID0gaW5uZXJNYXAuZ2V0KG5hbWUpO1xuICAgICAgICBpZiAoaW5uZXJWYWx1ZSAhPT0gdW5kZWZpbmVkKSByZXR1cm4gaW5uZXJWYWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgZm9yRWFjaChjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIHRoaXMubmFtZXNwYWNlLmZvckVhY2goKHYsIG4pID0+XG4gICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHYsIG4sIHRoaXMpKTtcblxuICAgIHRoaXMucmVleHBvcnRzLmZvckVhY2goKHJlZXhwb3J0cywgbmFtZSkgPT4ge1xuICAgICAgY29uc3QgcmVleHBvcnRlZCA9IHJlZXhwb3J0cy5nZXRJbXBvcnQoKTtcbiAgICAgIC8vIGNhbid0IGxvb2sgdXAgbWV0YSBmb3IgaWdub3JlZCByZS1leHBvcnRzICgjMzQ4KVxuICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCByZWV4cG9ydGVkICYmIHJlZXhwb3J0ZWQuZ2V0KHJlZXhwb3J0cy5sb2NhbCksIG5hbWUsIHRoaXMpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5kZXBlbmRlbmNpZXMuZm9yRWFjaChkZXAgPT4ge1xuICAgICAgY29uc3QgZCA9IGRlcCgpO1xuICAgICAgLy8gQ0pTIC8gaWdub3JlZCBkZXBlbmRlbmNpZXMgd29uJ3QgZXhpc3QgKCM3MTcpXG4gICAgICBpZiAoZCA9PSBudWxsKSByZXR1cm47XG5cbiAgICAgIGQuZm9yRWFjaCgodiwgbikgPT5cbiAgICAgICAgbiAhPT0gJ2RlZmF1bHQnICYmIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgdiwgbiwgdGhpcykpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gdG9kbzoga2V5cywgdmFsdWVzLCBlbnRyaWVzP1xuXG4gIHJlcG9ydEVycm9ycyhjb250ZXh0LCBkZWNsYXJhdGlvbikge1xuICAgIGNvbnRleHQucmVwb3J0KHtcbiAgICAgIG5vZGU6IGRlY2xhcmF0aW9uLnNvdXJjZSxcbiAgICAgIG1lc3NhZ2U6IGBQYXJzZSBlcnJvcnMgaW4gaW1wb3J0ZWQgbW9kdWxlICcke2RlY2xhcmF0aW9uLnNvdXJjZS52YWx1ZX0nOiBgICtcbiAgICAgICAgICAgICAgICAgIGAke3RoaXMuZXJyb3JzXG4gICAgICAgICAgICAgICAgICAgIC5tYXAoZSA9PiBgJHtlLm1lc3NhZ2V9ICgke2UubGluZU51bWJlcn06JHtlLmNvbHVtbn0pYClcbiAgICAgICAgICAgICAgICAgICAgLmpvaW4oJywgJyl9YCxcbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAqIHBhcnNlIGRvY3MgZnJvbSB0aGUgZmlyc3Qgbm9kZSB0aGF0IGhhcyBsZWFkaW5nIGNvbW1lbnRzXG4gKi9cbmZ1bmN0aW9uIGNhcHR1cmVEb2Moc291cmNlLCBkb2NTdHlsZVBhcnNlcnMsIC4uLm5vZGVzKSB7XG4gIGNvbnN0IG1ldGFkYXRhID0ge307XG5cbiAgLy8gJ3NvbWUnIHNob3J0LWNpcmN1aXRzIG9uIGZpcnN0ICd0cnVlJ1xuICBub2Rlcy5zb21lKG4gPT4ge1xuICAgIHRyeSB7XG5cbiAgICAgIGxldCBsZWFkaW5nQ29tbWVudHM7XG5cbiAgICAgIC8vIG4ubGVhZGluZ0NvbW1lbnRzIGlzIGxlZ2FjeSBgYXR0YWNoQ29tbWVudHNgIGJlaGF2aW9yXG4gICAgICBpZiAoJ2xlYWRpbmdDb21tZW50cycgaW4gbikge1xuICAgICAgICBsZWFkaW5nQ29tbWVudHMgPSBuLmxlYWRpbmdDb21tZW50cztcbiAgICAgIH0gZWxzZSBpZiAobi5yYW5nZSkge1xuICAgICAgICBsZWFkaW5nQ29tbWVudHMgPSBzb3VyY2UuZ2V0Q29tbWVudHNCZWZvcmUobik7XG4gICAgICB9XG5cbiAgICAgIGlmICghbGVhZGluZ0NvbW1lbnRzIHx8IGxlYWRpbmdDb21tZW50cy5sZW5ndGggPT09IDApIHJldHVybiBmYWxzZTtcblxuICAgICAgZm9yIChjb25zdCBuYW1lIGluIGRvY1N0eWxlUGFyc2Vycykge1xuICAgICAgICBjb25zdCBkb2MgPSBkb2NTdHlsZVBhcnNlcnNbbmFtZV0obGVhZGluZ0NvbW1lbnRzKTtcbiAgICAgICAgaWYgKGRvYykge1xuICAgICAgICAgIG1ldGFkYXRhLmRvYyA9IGRvYztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBtZXRhZGF0YTtcbn1cblxuY29uc3QgYXZhaWxhYmxlRG9jU3R5bGVQYXJzZXJzID0ge1xuICBqc2RvYzogY2FwdHVyZUpzRG9jLFxuICB0b21kb2M6IGNhcHR1cmVUb21Eb2MsXG59O1xuXG4vKipcbiAqIHBhcnNlIEpTRG9jIGZyb20gbGVhZGluZyBjb21tZW50c1xuICogQHBhcmFtIHtvYmplY3RbXX0gY29tbWVudHNcbiAqIEByZXR1cm4ge3sgZG9jOiBvYmplY3QgfX1cbiAqL1xuZnVuY3Rpb24gY2FwdHVyZUpzRG9jKGNvbW1lbnRzKSB7XG4gIGxldCBkb2M7XG5cbiAgLy8gY2FwdHVyZSBYU0RvY1xuICBjb21tZW50cy5mb3JFYWNoKGNvbW1lbnQgPT4ge1xuICAgIC8vIHNraXAgbm9uLWJsb2NrIGNvbW1lbnRzXG4gICAgaWYgKGNvbW1lbnQudHlwZSAhPT0gJ0Jsb2NrJykgcmV0dXJuO1xuICAgIHRyeSB7XG4gICAgICBkb2MgPSBkb2N0cmluZS5wYXJzZShjb21tZW50LnZhbHVlLCB7IHVud3JhcDogdHJ1ZSB9KTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIC8qIGRvbid0IGNhcmUsIGZvciBub3c/IG1heWJlIGFkZCB0byBgZXJyb3JzP2AgKi9cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBkb2M7XG59XG5cbi8qKlxuICAqIHBhcnNlIFRvbURvYyBzZWN0aW9uIGZyb20gY29tbWVudHNcbiAgKi9cbmZ1bmN0aW9uIGNhcHR1cmVUb21Eb2MoY29tbWVudHMpIHtcbiAgLy8gY29sbGVjdCBsaW5lcyB1cCB0byBmaXJzdCBwYXJhZ3JhcGggYnJlYWtcbiAgY29uc3QgbGluZXMgPSBbXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb21tZW50cy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGNvbW1lbnQgPSBjb21tZW50c1tpXTtcbiAgICBpZiAoY29tbWVudC52YWx1ZS5tYXRjaCgvXlxccyokLykpIGJyZWFrO1xuICAgIGxpbmVzLnB1c2goY29tbWVudC52YWx1ZS50cmltKCkpO1xuICB9XG5cbiAgLy8gcmV0dXJuIGRvY3RyaW5lLWxpa2Ugb2JqZWN0XG4gIGNvbnN0IHN0YXR1c01hdGNoID0gbGluZXMuam9pbignICcpLm1hdGNoKC9eKFB1YmxpY3xJbnRlcm5hbHxEZXByZWNhdGVkKTpcXHMqKC4rKS8pO1xuICBpZiAoc3RhdHVzTWF0Y2gpIHtcbiAgICByZXR1cm4ge1xuICAgICAgZGVzY3JpcHRpb246IHN0YXR1c01hdGNoWzJdLFxuICAgICAgdGFnczogW3tcbiAgICAgICAgdGl0bGU6IHN0YXR1c01hdGNoWzFdLnRvTG93ZXJDYXNlKCksXG4gICAgICAgIGRlc2NyaXB0aW9uOiBzdGF0dXNNYXRjaFsyXSxcbiAgICAgIH1dLFxuICAgIH07XG4gIH1cbn1cblxuY29uc3Qgc3VwcG9ydGVkSW1wb3J0VHlwZXMgPSBuZXcgU2V0KFsnSW1wb3J0RGVmYXVsdFNwZWNpZmllcicsICdJbXBvcnROYW1lc3BhY2VTcGVjaWZpZXInXSk7XG5cbkV4cG9ydE1hcC5nZXQgPSBmdW5jdGlvbiAoc291cmNlLCBjb250ZXh0KSB7XG4gIGNvbnN0IHBhdGggPSByZXNvbHZlKHNvdXJjZSwgY29udGV4dCk7XG4gIGlmIChwYXRoID09IG51bGwpIHJldHVybiBudWxsO1xuXG4gIHJldHVybiBFeHBvcnRNYXAuZm9yKGNoaWxkQ29udGV4dChwYXRoLCBjb250ZXh0KSk7XG59O1xuXG5FeHBvcnRNYXAuZm9yID0gZnVuY3Rpb24gKGNvbnRleHQpIHtcbiAgY29uc3QgeyBwYXRoIH0gPSBjb250ZXh0O1xuXG4gIGNvbnN0IGNhY2hlS2V5ID0gaGFzaE9iamVjdChjb250ZXh0KS5kaWdlc3QoJ2hleCcpO1xuICBsZXQgZXhwb3J0TWFwID0gZXhwb3J0Q2FjaGUuZ2V0KGNhY2hlS2V5KTtcblxuICAvLyByZXR1cm4gY2FjaGVkIGlnbm9yZVxuICBpZiAoZXhwb3J0TWFwID09PSBudWxsKSByZXR1cm4gbnVsbDtcblxuICBjb25zdCBzdGF0cyA9IGZzLnN0YXRTeW5jKHBhdGgpO1xuICBpZiAoZXhwb3J0TWFwICE9IG51bGwpIHtcbiAgICAvLyBkYXRlIGVxdWFsaXR5IGNoZWNrXG4gICAgaWYgKGV4cG9ydE1hcC5tdGltZSAtIHN0YXRzLm10aW1lID09PSAwKSB7XG4gICAgICByZXR1cm4gZXhwb3J0TWFwO1xuICAgIH1cbiAgICAvLyBmdXR1cmU6IGNoZWNrIGNvbnRlbnQgZXF1YWxpdHk/XG4gIH1cblxuICAvLyBjaGVjayB2YWxpZCBleHRlbnNpb25zIGZpcnN0XG4gIGlmICghaGFzVmFsaWRFeHRlbnNpb24ocGF0aCwgY29udGV4dCkpIHtcbiAgICBleHBvcnRDYWNoZS5zZXQoY2FjaGVLZXksIG51bGwpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gY2hlY2sgZm9yIGFuZCBjYWNoZSBpZ25vcmVcbiAgaWYgKGlzSWdub3JlZChwYXRoLCBjb250ZXh0KSkge1xuICAgIGxvZygnaWdub3JlZCBwYXRoIGR1ZSB0byBpZ25vcmUgc2V0dGluZ3M6JywgcGF0aCk7XG4gICAgZXhwb3J0Q2FjaGUuc2V0KGNhY2hlS2V5LCBudWxsKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMocGF0aCwgeyBlbmNvZGluZzogJ3V0ZjgnIH0pO1xuXG4gIC8vIGNoZWNrIGZvciBhbmQgY2FjaGUgdW5hbWJpZ3VvdXMgbW9kdWxlc1xuICBpZiAoIXVuYW1iaWd1b3VzLnRlc3QoY29udGVudCkpIHtcbiAgICBsb2coJ2lnbm9yZWQgcGF0aCBkdWUgdG8gdW5hbWJpZ3VvdXMgcmVnZXg6JywgcGF0aCk7XG4gICAgZXhwb3J0Q2FjaGUuc2V0KGNhY2hlS2V5LCBudWxsKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGxvZygnY2FjaGUgbWlzcycsIGNhY2hlS2V5LCAnZm9yIHBhdGgnLCBwYXRoKTtcbiAgZXhwb3J0TWFwID0gRXhwb3J0TWFwLnBhcnNlKHBhdGgsIGNvbnRlbnQsIGNvbnRleHQpO1xuXG4gIC8vIGFtYmlndW91cyBtb2R1bGVzIHJldHVybiBudWxsXG4gIGlmIChleHBvcnRNYXAgPT0gbnVsbCkgcmV0dXJuIG51bGw7XG5cbiAgZXhwb3J0TWFwLm10aW1lID0gc3RhdHMubXRpbWU7XG5cbiAgZXhwb3J0Q2FjaGUuc2V0KGNhY2hlS2V5LCBleHBvcnRNYXApO1xuICByZXR1cm4gZXhwb3J0TWFwO1xufTtcblxuXG5FeHBvcnRNYXAucGFyc2UgPSBmdW5jdGlvbiAocGF0aCwgY29udGVudCwgY29udGV4dCkge1xuICBjb25zdCBtID0gbmV3IEV4cG9ydE1hcChwYXRoKTtcbiAgY29uc3QgaXNFc01vZHVsZUludGVyb3BUcnVlID0gaXNFc01vZHVsZUludGVyb3AoKTtcblxuICBsZXQgYXN0O1xuICBsZXQgdmlzaXRvcktleXM7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVzdWx0ID0gcGFyc2UocGF0aCwgY29udGVudCwgY29udGV4dCk7XG4gICAgYXN0ID0gcmVzdWx0LmFzdDtcbiAgICB2aXNpdG9yS2V5cyA9IHJlc3VsdC52aXNpdG9yS2V5cztcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgbS5lcnJvcnMucHVzaChlcnIpO1xuICAgIHJldHVybiBtOyAvLyBjYW4ndCBjb250aW51ZVxuICB9XG5cbiAgbS52aXNpdG9yS2V5cyA9IHZpc2l0b3JLZXlzO1xuXG4gIGxldCBoYXNEeW5hbWljSW1wb3J0cyA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIHByb2Nlc3NEeW5hbWljSW1wb3J0KHNvdXJjZSkge1xuICAgIGhhc0R5bmFtaWNJbXBvcnRzID0gdHJ1ZTtcbiAgICBpZiAoc291cmNlLnR5cGUgIT09ICdMaXRlcmFsJykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHAgPSByZW1vdGVQYXRoKHNvdXJjZS52YWx1ZSk7XG4gICAgaWYgKHAgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGltcG9ydGVkU3BlY2lmaWVycyA9IG5ldyBTZXQoKTtcbiAgICBpbXBvcnRlZFNwZWNpZmllcnMuYWRkKCdJbXBvcnROYW1lc3BhY2VTcGVjaWZpZXInKTtcbiAgICBjb25zdCBnZXR0ZXIgPSB0aHVua0ZvcihwLCBjb250ZXh0KTtcbiAgICBtLmltcG9ydHMuc2V0KHAsIHtcbiAgICAgIGdldHRlcixcbiAgICAgIGRlY2xhcmF0aW9uczogbmV3IFNldChbe1xuICAgICAgICBzb3VyY2U6IHtcbiAgICAgICAgLy8gY2FwdHVyaW5nIGFjdHVhbCBub2RlIHJlZmVyZW5jZSBob2xkcyBmdWxsIEFTVCBpbiBtZW1vcnkhXG4gICAgICAgICAgdmFsdWU6IHNvdXJjZS52YWx1ZSxcbiAgICAgICAgICBsb2M6IHNvdXJjZS5sb2MsXG4gICAgICAgIH0sXG4gICAgICAgIGltcG9ydGVkU3BlY2lmaWVycyxcbiAgICAgICAgZHluYW1pYzogdHJ1ZSxcbiAgICAgIH1dKSxcbiAgICB9KTtcbiAgfVxuXG4gIHZpc2l0KGFzdCwgdmlzaXRvcktleXMsIHtcbiAgICBJbXBvcnRFeHByZXNzaW9uKG5vZGUpIHtcbiAgICAgIHByb2Nlc3NEeW5hbWljSW1wb3J0KG5vZGUuc291cmNlKTtcbiAgICB9LFxuICAgIENhbGxFeHByZXNzaW9uKG5vZGUpIHtcbiAgICAgIGlmIChub2RlLmNhbGxlZS50eXBlID09PSAnSW1wb3J0Jykge1xuICAgICAgICBwcm9jZXNzRHluYW1pY0ltcG9ydChub2RlLmFyZ3VtZW50c1swXSk7XG4gICAgICB9XG4gICAgfSxcbiAgfSk7XG5cbiAgY29uc3QgdW5hbWJpZ3VvdXNseUVTTSA9IHVuYW1iaWd1b3VzLmlzTW9kdWxlKGFzdCk7XG4gIGlmICghdW5hbWJpZ3VvdXNseUVTTSAmJiAhaGFzRHluYW1pY0ltcG9ydHMpIHJldHVybiBudWxsO1xuXG4gIGNvbnN0IGRvY3N0eWxlID0gKGNvbnRleHQuc2V0dGluZ3MgJiYgY29udGV4dC5zZXR0aW5nc1snaW1wb3J0L2RvY3N0eWxlJ10pIHx8IFsnanNkb2MnXTtcbiAgY29uc3QgZG9jU3R5bGVQYXJzZXJzID0ge307XG4gIGRvY3N0eWxlLmZvckVhY2goc3R5bGUgPT4ge1xuICAgIGRvY1N0eWxlUGFyc2Vyc1tzdHlsZV0gPSBhdmFpbGFibGVEb2NTdHlsZVBhcnNlcnNbc3R5bGVdO1xuICB9KTtcblxuICAvLyBhdHRlbXB0IHRvIGNvbGxlY3QgbW9kdWxlIGRvY1xuICBpZiAoYXN0LmNvbW1lbnRzKSB7XG4gICAgYXN0LmNvbW1lbnRzLnNvbWUoYyA9PiB7XG4gICAgICBpZiAoYy50eXBlICE9PSAnQmxvY2snKSByZXR1cm4gZmFsc2U7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBkb2MgPSBkb2N0cmluZS5wYXJzZShjLnZhbHVlLCB7IHVud3JhcDogdHJ1ZSB9KTtcbiAgICAgICAgaWYgKGRvYy50YWdzLnNvbWUodCA9PiB0LnRpdGxlID09PSAnbW9kdWxlJykpIHtcbiAgICAgICAgICBtLmRvYyA9IGRvYztcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyKSB7IC8qIGlnbm9yZSAqLyB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gIH1cblxuICBjb25zdCBuYW1lc3BhY2VzID0gbmV3IE1hcCgpO1xuXG4gIGZ1bmN0aW9uIHJlbW90ZVBhdGgodmFsdWUpIHtcbiAgICByZXR1cm4gcmVzb2x2ZS5yZWxhdGl2ZSh2YWx1ZSwgcGF0aCwgY29udGV4dC5zZXR0aW5ncyk7XG4gIH1cblxuICBmdW5jdGlvbiByZXNvbHZlSW1wb3J0KHZhbHVlKSB7XG4gICAgY29uc3QgcnAgPSByZW1vdGVQYXRoKHZhbHVlKTtcbiAgICBpZiAocnAgPT0gbnVsbCkgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIEV4cG9ydE1hcC5mb3IoY2hpbGRDb250ZXh0KHJwLCBjb250ZXh0KSk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXROYW1lc3BhY2UoaWRlbnRpZmllcikge1xuICAgIGlmICghbmFtZXNwYWNlcy5oYXMoaWRlbnRpZmllci5uYW1lKSkgcmV0dXJuO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiByZXNvbHZlSW1wb3J0KG5hbWVzcGFjZXMuZ2V0KGlkZW50aWZpZXIubmFtZSkpO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBhZGROYW1lc3BhY2Uob2JqZWN0LCBpZGVudGlmaWVyKSB7XG4gICAgY29uc3QgbnNmbiA9IGdldE5hbWVzcGFjZShpZGVudGlmaWVyKTtcbiAgICBpZiAobnNmbikge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgJ25hbWVzcGFjZScsIHsgZ2V0OiBuc2ZuIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBvYmplY3Q7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9jZXNzU3BlY2lmaWVyKHMsIG4sIG0pIHtcbiAgICBjb25zdCBuc291cmNlID0gbi5zb3VyY2UgJiYgbi5zb3VyY2UudmFsdWU7XG4gICAgY29uc3QgZXhwb3J0TWV0YSA9IHt9O1xuICAgIGxldCBsb2NhbDtcblxuICAgIHN3aXRjaCAocy50eXBlKSB7XG4gICAgY2FzZSAnRXhwb3J0RGVmYXVsdFNwZWNpZmllcic6XG4gICAgICBpZiAoIW5zb3VyY2UpIHJldHVybjtcbiAgICAgIGxvY2FsID0gJ2RlZmF1bHQnO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnRXhwb3J0TmFtZXNwYWNlU3BlY2lmaWVyJzpcbiAgICAgIG0ubmFtZXNwYWNlLnNldChzLmV4cG9ydGVkLm5hbWUsIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRNZXRhLCAnbmFtZXNwYWNlJywge1xuICAgICAgICBnZXQoKSB7IHJldHVybiByZXNvbHZlSW1wb3J0KG5zb3VyY2UpOyB9LFxuICAgICAgfSkpO1xuICAgICAgcmV0dXJuO1xuICAgIGNhc2UgJ0V4cG9ydEFsbERlY2xhcmF0aW9uJzpcbiAgICAgIG0ubmFtZXNwYWNlLnNldChzLmV4cG9ydGVkLm5hbWUgfHwgcy5leHBvcnRlZC52YWx1ZSwgYWRkTmFtZXNwYWNlKGV4cG9ydE1ldGEsIHMuc291cmNlLnZhbHVlKSk7XG4gICAgICByZXR1cm47XG4gICAgY2FzZSAnRXhwb3J0U3BlY2lmaWVyJzpcbiAgICAgIGlmICghbi5zb3VyY2UpIHtcbiAgICAgICAgbS5uYW1lc3BhY2Uuc2V0KHMuZXhwb3J0ZWQubmFtZSB8fCBzLmV4cG9ydGVkLnZhbHVlLCBhZGROYW1lc3BhY2UoZXhwb3J0TWV0YSwgcy5sb2NhbCkpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICAvLyBlbHNlIGZhbGxzIHRocm91Z2hcbiAgICBkZWZhdWx0OlxuICAgICAgbG9jYWwgPSBzLmxvY2FsLm5hbWU7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyB0b2RvOiBKU0RvY1xuICAgIG0ucmVleHBvcnRzLnNldChzLmV4cG9ydGVkLm5hbWUsIHsgbG9jYWwsIGdldEltcG9ydDogKCkgPT4gcmVzb2x2ZUltcG9ydChuc291cmNlKSB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNhcHR1cmVEZXBlbmRlbmN5KHsgc291cmNlIH0sIGlzT25seUltcG9ydGluZ1R5cGVzLCBpbXBvcnRlZFNwZWNpZmllcnMgPSBuZXcgU2V0KCkpIHtcbiAgICBpZiAoc291cmNlID09IG51bGwpIHJldHVybiBudWxsO1xuXG4gICAgY29uc3QgcCA9IHJlbW90ZVBhdGgoc291cmNlLnZhbHVlKTtcbiAgICBpZiAocCA9PSBudWxsKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGRlY2xhcmF0aW9uTWV0YWRhdGEgPSB7XG4gICAgICAvLyBjYXB0dXJpbmcgYWN0dWFsIG5vZGUgcmVmZXJlbmNlIGhvbGRzIGZ1bGwgQVNUIGluIG1lbW9yeSFcbiAgICAgIHNvdXJjZTogeyB2YWx1ZTogc291cmNlLnZhbHVlLCBsb2M6IHNvdXJjZS5sb2MgfSxcbiAgICAgIGlzT25seUltcG9ydGluZ1R5cGVzLFxuICAgICAgaW1wb3J0ZWRTcGVjaWZpZXJzLFxuICAgIH07XG5cbiAgICBjb25zdCBleGlzdGluZyA9IG0uaW1wb3J0cy5nZXQocCk7XG4gICAgaWYgKGV4aXN0aW5nICE9IG51bGwpIHtcbiAgICAgIGV4aXN0aW5nLmRlY2xhcmF0aW9ucy5hZGQoZGVjbGFyYXRpb25NZXRhZGF0YSk7XG4gICAgICByZXR1cm4gZXhpc3RpbmcuZ2V0dGVyO1xuICAgIH1cblxuICAgIGNvbnN0IGdldHRlciA9IHRodW5rRm9yKHAsIGNvbnRleHQpO1xuICAgIG0uaW1wb3J0cy5zZXQocCwgeyBnZXR0ZXIsIGRlY2xhcmF0aW9uczogbmV3IFNldChbZGVjbGFyYXRpb25NZXRhZGF0YV0pIH0pO1xuICAgIHJldHVybiBnZXR0ZXI7XG4gIH1cblxuICBjb25zdCBzb3VyY2UgPSBtYWtlU291cmNlQ29kZShjb250ZW50LCBhc3QpO1xuXG4gIGZ1bmN0aW9uIHJlYWRUc0NvbmZpZygpIHtcbiAgICBjb25zdCB0c0NvbmZpZ0luZm8gPSB0c0NvbmZpZ0xvYWRlcih7XG4gICAgICBjd2Q6XG4gICAgICAgIChjb250ZXh0LnBhcnNlck9wdGlvbnMgJiYgY29udGV4dC5wYXJzZXJPcHRpb25zLnRzY29uZmlnUm9vdERpcikgfHxcbiAgICAgICAgcHJvY2Vzcy5jd2QoKSxcbiAgICAgIGdldEVudjogKGtleSkgPT4gcHJvY2Vzcy5lbnZba2V5XSxcbiAgICB9KTtcbiAgICB0cnkge1xuICAgICAgaWYgKHRzQ29uZmlnSW5mby50c0NvbmZpZ1BhdGggIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBQcm9qZWN0cyBub3QgdXNpbmcgVHlwZVNjcmlwdCB3b24ndCBoYXZlIGB0eXBlc2NyaXB0YCBpbnN0YWxsZWQuXG4gICAgICAgIGlmICghdHMpIHsgdHMgPSByZXF1aXJlKCd0eXBlc2NyaXB0Jyk7IH1cbiAgXG4gICAgICAgIGNvbnN0IGNvbmZpZ0ZpbGUgPSB0cy5yZWFkQ29uZmlnRmlsZSh0c0NvbmZpZ0luZm8udHNDb25maWdQYXRoLCB0cy5zeXMucmVhZEZpbGUpO1xuICAgICAgICByZXR1cm4gdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQoXG4gICAgICAgICAgY29uZmlnRmlsZS5jb25maWcsXG4gICAgICAgICAgdHMuc3lzLFxuICAgICAgICAgIGRpcm5hbWUodHNDb25maWdJbmZvLnRzQ29uZmlnUGF0aCksXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gQ2F0Y2ggYW55IGVycm9yc1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNFc01vZHVsZUludGVyb3AoKSB7XG4gICAgY29uc3QgY2FjaGVLZXkgPSBoYXNoT2JqZWN0KHtcbiAgICAgIHRzY29uZmlnUm9vdERpcjogY29udGV4dC5wYXJzZXJPcHRpb25zICYmIGNvbnRleHQucGFyc2VyT3B0aW9ucy50c2NvbmZpZ1Jvb3REaXIsXG4gICAgfSkuZGlnZXN0KCdoZXgnKTtcbiAgICBsZXQgdHNDb25maWcgPSB0c0NvbmZpZ0NhY2hlLmdldChjYWNoZUtleSk7XG4gICAgaWYgKHR5cGVvZiB0c0NvbmZpZyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRzQ29uZmlnID0gcmVhZFRzQ29uZmlnKGNvbnRleHQpO1xuICAgICAgdHNDb25maWdDYWNoZS5zZXQoY2FjaGVLZXksIHRzQ29uZmlnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHNDb25maWcgJiYgdHNDb25maWcub3B0aW9ucyA/IHRzQ29uZmlnLm9wdGlvbnMuZXNNb2R1bGVJbnRlcm9wIDogZmFsc2U7XG4gIH1cblxuICBhc3QuYm9keS5mb3JFYWNoKGZ1bmN0aW9uIChuKSB7XG4gICAgaWYgKG4udHlwZSA9PT0gJ0V4cG9ydERlZmF1bHREZWNsYXJhdGlvbicpIHtcbiAgICAgIGNvbnN0IGV4cG9ydE1ldGEgPSBjYXB0dXJlRG9jKHNvdXJjZSwgZG9jU3R5bGVQYXJzZXJzLCBuKTtcbiAgICAgIGlmIChuLmRlY2xhcmF0aW9uLnR5cGUgPT09ICdJZGVudGlmaWVyJykge1xuICAgICAgICBhZGROYW1lc3BhY2UoZXhwb3J0TWV0YSwgbi5kZWNsYXJhdGlvbik7XG4gICAgICB9XG4gICAgICBtLm5hbWVzcGFjZS5zZXQoJ2RlZmF1bHQnLCBleHBvcnRNZXRhKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAobi50eXBlID09PSAnRXhwb3J0QWxsRGVjbGFyYXRpb24nKSB7XG4gICAgICBjb25zdCBnZXR0ZXIgPSBjYXB0dXJlRGVwZW5kZW5jeShuLCBuLmV4cG9ydEtpbmQgPT09ICd0eXBlJyk7XG4gICAgICBpZiAoZ2V0dGVyKSBtLmRlcGVuZGVuY2llcy5hZGQoZ2V0dGVyKTtcbiAgICAgIGlmIChuLmV4cG9ydGVkKSB7XG4gICAgICAgIHByb2Nlc3NTcGVjaWZpZXIobiwgbi5leHBvcnRlZCwgbSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gY2FwdHVyZSBuYW1lc3BhY2VzIGluIGNhc2Ugb2YgbGF0ZXIgZXhwb3J0XG4gICAgaWYgKG4udHlwZSA9PT0gJ0ltcG9ydERlY2xhcmF0aW9uJykge1xuICAgICAgLy8gaW1wb3J0IHR5cGUgeyBGb28gfSAoVFMgYW5kIEZsb3cpXG4gICAgICBjb25zdCBkZWNsYXJhdGlvbklzVHlwZSA9IG4uaW1wb3J0S2luZCA9PT0gJ3R5cGUnO1xuICAgICAgLy8gaW1wb3J0ICcuL2Zvbycgb3IgaW1wb3J0IHt9IGZyb20gJy4vZm9vJyAoYm90aCAwIHNwZWNpZmllcnMpIGlzIGEgc2lkZSBlZmZlY3QgYW5kXG4gICAgICAvLyBzaG91bGRuJ3QgYmUgY29uc2lkZXJlZCB0byBiZSBqdXN0IGltcG9ydGluZyB0eXBlc1xuICAgICAgbGV0IHNwZWNpZmllcnNPbmx5SW1wb3J0aW5nVHlwZXMgPSBuLnNwZWNpZmllcnMubGVuZ3RoO1xuICAgICAgY29uc3QgaW1wb3J0ZWRTcGVjaWZpZXJzID0gbmV3IFNldCgpO1xuICAgICAgbi5zcGVjaWZpZXJzLmZvckVhY2goc3BlY2lmaWVyID0+IHtcbiAgICAgICAgaWYgKHN1cHBvcnRlZEltcG9ydFR5cGVzLmhhcyhzcGVjaWZpZXIudHlwZSkpIHtcbiAgICAgICAgICBpbXBvcnRlZFNwZWNpZmllcnMuYWRkKHNwZWNpZmllci50eXBlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3BlY2lmaWVyLnR5cGUgPT09ICdJbXBvcnRTcGVjaWZpZXInKSB7XG4gICAgICAgICAgaW1wb3J0ZWRTcGVjaWZpZXJzLmFkZChzcGVjaWZpZXIuaW1wb3J0ZWQubmFtZSB8fCBzcGVjaWZpZXIuaW1wb3J0ZWQudmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaW1wb3J0IHsgdHlwZSBGb28gfSAoRmxvdylcbiAgICAgICAgc3BlY2lmaWVyc09ubHlJbXBvcnRpbmdUeXBlcyA9XG4gICAgICAgICAgc3BlY2lmaWVyc09ubHlJbXBvcnRpbmdUeXBlcyAmJiBzcGVjaWZpZXIuaW1wb3J0S2luZCA9PT0gJ3R5cGUnO1xuICAgICAgfSk7XG4gICAgICBjYXB0dXJlRGVwZW5kZW5jeShuLCBkZWNsYXJhdGlvbklzVHlwZSB8fCBzcGVjaWZpZXJzT25seUltcG9ydGluZ1R5cGVzLCBpbXBvcnRlZFNwZWNpZmllcnMpO1xuXG4gICAgICBjb25zdCBucyA9IG4uc3BlY2lmaWVycy5maW5kKHMgPT4gcy50eXBlID09PSAnSW1wb3J0TmFtZXNwYWNlU3BlY2lmaWVyJyk7XG4gICAgICBpZiAobnMpIHtcbiAgICAgICAgbmFtZXNwYWNlcy5zZXQobnMubG9jYWwubmFtZSwgbi5zb3VyY2UudmFsdWUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChuLnR5cGUgPT09ICdFeHBvcnROYW1lZERlY2xhcmF0aW9uJykge1xuICAgICAgLy8gY2FwdHVyZSBkZWNsYXJhdGlvblxuICAgICAgaWYgKG4uZGVjbGFyYXRpb24gIT0gbnVsbCkge1xuICAgICAgICBzd2l0Y2ggKG4uZGVjbGFyYXRpb24udHlwZSkge1xuICAgICAgICBjYXNlICdGdW5jdGlvbkRlY2xhcmF0aW9uJzpcbiAgICAgICAgY2FzZSAnQ2xhc3NEZWNsYXJhdGlvbic6XG4gICAgICAgIGNhc2UgJ1R5cGVBbGlhcyc6IC8vIGZsb3d0eXBlIHdpdGggYmFiZWwtZXNsaW50IHBhcnNlclxuICAgICAgICBjYXNlICdJbnRlcmZhY2VEZWNsYXJhdGlvbic6XG4gICAgICAgIGNhc2UgJ0RlY2xhcmVGdW5jdGlvbic6XG4gICAgICAgIGNhc2UgJ1RTRGVjbGFyZUZ1bmN0aW9uJzpcbiAgICAgICAgY2FzZSAnVFNFbnVtRGVjbGFyYXRpb24nOlxuICAgICAgICBjYXNlICdUU1R5cGVBbGlhc0RlY2xhcmF0aW9uJzpcbiAgICAgICAgY2FzZSAnVFNJbnRlcmZhY2VEZWNsYXJhdGlvbic6XG4gICAgICAgIGNhc2UgJ1RTQWJzdHJhY3RDbGFzc0RlY2xhcmF0aW9uJzpcbiAgICAgICAgY2FzZSAnVFNNb2R1bGVEZWNsYXJhdGlvbic6XG4gICAgICAgICAgbS5uYW1lc3BhY2Uuc2V0KG4uZGVjbGFyYXRpb24uaWQubmFtZSwgY2FwdHVyZURvYyhzb3VyY2UsIGRvY1N0eWxlUGFyc2VycywgbikpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdWYXJpYWJsZURlY2xhcmF0aW9uJzpcbiAgICAgICAgICBuLmRlY2xhcmF0aW9uLmRlY2xhcmF0aW9ucy5mb3JFYWNoKChkKSA9PlxuICAgICAgICAgICAgcmVjdXJzaXZlUGF0dGVybkNhcHR1cmUoZC5pZCxcbiAgICAgICAgICAgICAgaWQgPT4gbS5uYW1lc3BhY2Uuc2V0KGlkLm5hbWUsIGNhcHR1cmVEb2Moc291cmNlLCBkb2NTdHlsZVBhcnNlcnMsIGQsIG4pKSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIG4uc3BlY2lmaWVycy5mb3JFYWNoKChzKSA9PiBwcm9jZXNzU3BlY2lmaWVyKHMsIG4sIG0pKTtcbiAgICB9XG5cbiAgICBjb25zdCBleHBvcnRzID0gWydUU0V4cG9ydEFzc2lnbm1lbnQnXTtcbiAgICBpZiAoaXNFc01vZHVsZUludGVyb3BUcnVlKSB7XG4gICAgICBleHBvcnRzLnB1c2goJ1RTTmFtZXNwYWNlRXhwb3J0RGVjbGFyYXRpb24nKTtcbiAgICB9XG5cbiAgICAvLyBUaGlzIGRvZXNuJ3QgZGVjbGFyZSBhbnl0aGluZywgYnV0IGNoYW5nZXMgd2hhdCdzIGJlaW5nIGV4cG9ydGVkLlxuICAgIGlmIChpbmNsdWRlcyhleHBvcnRzLCBuLnR5cGUpKSB7XG4gICAgICBjb25zdCBleHBvcnRlZE5hbWUgPSBuLnR5cGUgPT09ICdUU05hbWVzcGFjZUV4cG9ydERlY2xhcmF0aW9uJ1xuICAgICAgICA/IChuLmlkIHx8IG4ubmFtZSkubmFtZVxuICAgICAgICA6IChuLmV4cHJlc3Npb24gJiYgbi5leHByZXNzaW9uLm5hbWUgfHwgKG4uZXhwcmVzc2lvbi5pZCAmJiBuLmV4cHJlc3Npb24uaWQubmFtZSkgfHwgbnVsbCk7XG4gICAgICBjb25zdCBkZWNsVHlwZXMgPSBbXG4gICAgICAgICdWYXJpYWJsZURlY2xhcmF0aW9uJyxcbiAgICAgICAgJ0NsYXNzRGVjbGFyYXRpb24nLFxuICAgICAgICAnVFNEZWNsYXJlRnVuY3Rpb24nLFxuICAgICAgICAnVFNFbnVtRGVjbGFyYXRpb24nLFxuICAgICAgICAnVFNUeXBlQWxpYXNEZWNsYXJhdGlvbicsXG4gICAgICAgICdUU0ludGVyZmFjZURlY2xhcmF0aW9uJyxcbiAgICAgICAgJ1RTQWJzdHJhY3RDbGFzc0RlY2xhcmF0aW9uJyxcbiAgICAgICAgJ1RTTW9kdWxlRGVjbGFyYXRpb24nLFxuICAgICAgXTtcbiAgICAgIGNvbnN0IGV4cG9ydGVkRGVjbHMgPSBhc3QuYm9keS5maWx0ZXIoKHsgdHlwZSwgaWQsIGRlY2xhcmF0aW9ucyB9KSA9PiBpbmNsdWRlcyhkZWNsVHlwZXMsIHR5cGUpICYmIChcbiAgICAgICAgKGlkICYmIGlkLm5hbWUgPT09IGV4cG9ydGVkTmFtZSkgfHwgKGRlY2xhcmF0aW9ucyAmJiBkZWNsYXJhdGlvbnMuZmluZCgoZCkgPT4gZC5pZC5uYW1lID09PSBleHBvcnRlZE5hbWUpKVxuICAgICAgKSk7XG4gICAgICBpZiAoZXhwb3J0ZWREZWNscy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8gRXhwb3J0IGlzIG5vdCByZWZlcmVuY2luZyBhbnkgbG9jYWwgZGVjbGFyYXRpb24sIG11c3QgYmUgcmUtZXhwb3J0aW5nXG4gICAgICAgIG0ubmFtZXNwYWNlLnNldCgnZGVmYXVsdCcsIGNhcHR1cmVEb2Moc291cmNlLCBkb2NTdHlsZVBhcnNlcnMsIG4pKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKFxuICAgICAgICBpc0VzTW9kdWxlSW50ZXJvcFRydWUgLy8gZXNNb2R1bGVJbnRlcm9wIGlzIG9uIGluIHRzY29uZmlnXG4gICAgICAgICYmICFtLm5hbWVzcGFjZS5oYXMoJ2RlZmF1bHQnKSAvLyBhbmQgZGVmYXVsdCBpc24ndCBhZGRlZCBhbHJlYWR5XG4gICAgICApIHtcbiAgICAgICAgbS5uYW1lc3BhY2Uuc2V0KCdkZWZhdWx0Jywge30pOyAvLyBhZGQgZGVmYXVsdCBleHBvcnRcbiAgICAgIH1cbiAgICAgIGV4cG9ydGVkRGVjbHMuZm9yRWFjaCgoZGVjbCkgPT4ge1xuICAgICAgICBpZiAoZGVjbC50eXBlID09PSAnVFNNb2R1bGVEZWNsYXJhdGlvbicpIHtcbiAgICAgICAgICBpZiAoZGVjbC5ib2R5ICYmIGRlY2wuYm9keS50eXBlID09PSAnVFNNb2R1bGVEZWNsYXJhdGlvbicpIHtcbiAgICAgICAgICAgIG0ubmFtZXNwYWNlLnNldChkZWNsLmJvZHkuaWQubmFtZSwgY2FwdHVyZURvYyhzb3VyY2UsIGRvY1N0eWxlUGFyc2VycywgZGVjbC5ib2R5KSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChkZWNsLmJvZHkgJiYgZGVjbC5ib2R5LmJvZHkpIHtcbiAgICAgICAgICAgIGRlY2wuYm9keS5ib2R5LmZvckVhY2goKG1vZHVsZUJsb2NrTm9kZSkgPT4ge1xuICAgICAgICAgICAgICAvLyBFeHBvcnQtYXNzaWdubWVudCBleHBvcnRzIGFsbCBtZW1iZXJzIGluIHRoZSBuYW1lc3BhY2UsXG4gICAgICAgICAgICAgIC8vIGV4cGxpY2l0bHkgZXhwb3J0ZWQgb3Igbm90LlxuICAgICAgICAgICAgICBjb25zdCBuYW1lc3BhY2VEZWNsID0gbW9kdWxlQmxvY2tOb2RlLnR5cGUgPT09ICdFeHBvcnROYW1lZERlY2xhcmF0aW9uJyA/XG4gICAgICAgICAgICAgICAgbW9kdWxlQmxvY2tOb2RlLmRlY2xhcmF0aW9uIDpcbiAgICAgICAgICAgICAgICBtb2R1bGVCbG9ja05vZGU7XG5cbiAgICAgICAgICAgICAgaWYgKCFuYW1lc3BhY2VEZWNsKSB7XG4gICAgICAgICAgICAgICAgLy8gVHlwZVNjcmlwdCBjYW4gY2hlY2sgdGhpcyBmb3IgdXM7IHdlIG5lZWRuJ3RcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChuYW1lc3BhY2VEZWNsLnR5cGUgPT09ICdWYXJpYWJsZURlY2xhcmF0aW9uJykge1xuICAgICAgICAgICAgICAgIG5hbWVzcGFjZURlY2wuZGVjbGFyYXRpb25zLmZvckVhY2goKGQpID0+XG4gICAgICAgICAgICAgICAgICByZWN1cnNpdmVQYXR0ZXJuQ2FwdHVyZShkLmlkLCAoaWQpID0+IG0ubmFtZXNwYWNlLnNldChcbiAgICAgICAgICAgICAgICAgICAgaWQubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgY2FwdHVyZURvYyhzb3VyY2UsIGRvY1N0eWxlUGFyc2VycywgZGVjbCwgbmFtZXNwYWNlRGVjbCwgbW9kdWxlQmxvY2tOb2RlKSxcbiAgICAgICAgICAgICAgICAgICkpLFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbS5uYW1lc3BhY2Uuc2V0KFxuICAgICAgICAgICAgICAgICAgbmFtZXNwYWNlRGVjbC5pZC5uYW1lLFxuICAgICAgICAgICAgICAgICAgY2FwdHVyZURvYyhzb3VyY2UsIGRvY1N0eWxlUGFyc2VycywgbW9kdWxlQmxvY2tOb2RlKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBFeHBvcnQgYXMgZGVmYXVsdFxuICAgICAgICAgIG0ubmFtZXNwYWNlLnNldCgnZGVmYXVsdCcsIGNhcHR1cmVEb2Moc291cmNlLCBkb2NTdHlsZVBhcnNlcnMsIGRlY2wpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICBpZiAoXG4gICAgaXNFc01vZHVsZUludGVyb3BUcnVlIC8vIGVzTW9kdWxlSW50ZXJvcCBpcyBvbiBpbiB0c2NvbmZpZ1xuICAgICYmIG0ubmFtZXNwYWNlLnNpemUgPiAwIC8vIGFueXRoaW5nIGlzIGV4cG9ydGVkXG4gICAgJiYgIW0ubmFtZXNwYWNlLmhhcygnZGVmYXVsdCcpIC8vIGFuZCBkZWZhdWx0IGlzbid0IGFkZGVkIGFscmVhZHlcbiAgKSB7XG4gICAgbS5uYW1lc3BhY2Uuc2V0KCdkZWZhdWx0Jywge30pOyAvLyBhZGQgZGVmYXVsdCBleHBvcnRcbiAgfVxuXG4gIGlmICh1bmFtYmlndW91c2x5RVNNKSB7XG4gICAgbS5wYXJzZUdvYWwgPSAnTW9kdWxlJztcbiAgfVxuICByZXR1cm4gbTtcbn07XG5cbi8qKlxuICogVGhlIGNyZWF0aW9uIG9mIHRoaXMgY2xvc3VyZSBpcyBpc29sYXRlZCBmcm9tIG90aGVyIHNjb3Blc1xuICogdG8gYXZvaWQgb3Zlci1yZXRlbnRpb24gb2YgdW5yZWxhdGVkIHZhcmlhYmxlcywgd2hpY2ggaGFzXG4gKiBjYXVzZWQgbWVtb3J5IGxlYWtzLiBTZWUgIzEyNjYuXG4gKi9cbmZ1bmN0aW9uIHRodW5rRm9yKHAsIGNvbnRleHQpIHtcbiAgcmV0dXJuICgpID0+IEV4cG9ydE1hcC5mb3IoY2hpbGRDb250ZXh0KHAsIGNvbnRleHQpKTtcbn1cblxuXG4vKipcbiAqIFRyYXZlcnNlIGEgcGF0dGVybi9pZGVudGlmaWVyIG5vZGUsIGNhbGxpbmcgJ2NhbGxiYWNrJ1xuICogZm9yIGVhY2ggbGVhZiBpZGVudGlmaWVyLlxuICogQHBhcmFtICB7bm9kZX0gICBwYXR0ZXJuXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAqIEByZXR1cm4ge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWN1cnNpdmVQYXR0ZXJuQ2FwdHVyZShwYXR0ZXJuLCBjYWxsYmFjaykge1xuICBzd2l0Y2ggKHBhdHRlcm4udHlwZSkge1xuICBjYXNlICdJZGVudGlmaWVyJzogLy8gYmFzZSBjYXNlXG4gICAgY2FsbGJhY2socGF0dGVybik7XG4gICAgYnJlYWs7XG5cbiAgY2FzZSAnT2JqZWN0UGF0dGVybic6XG4gICAgcGF0dGVybi5wcm9wZXJ0aWVzLmZvckVhY2gocCA9PiB7XG4gICAgICBpZiAocC50eXBlID09PSAnRXhwZXJpbWVudGFsUmVzdFByb3BlcnR5JyB8fCBwLnR5cGUgPT09ICdSZXN0RWxlbWVudCcpIHtcbiAgICAgICAgY2FsbGJhY2socC5hcmd1bWVudCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHJlY3Vyc2l2ZVBhdHRlcm5DYXB0dXJlKHAudmFsdWUsIGNhbGxiYWNrKTtcbiAgICB9KTtcbiAgICBicmVhaztcblxuICBjYXNlICdBcnJheVBhdHRlcm4nOlxuICAgIHBhdHRlcm4uZWxlbWVudHMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xuICAgICAgaWYgKGVsZW1lbnQgPT0gbnVsbCkgcmV0dXJuO1xuICAgICAgaWYgKGVsZW1lbnQudHlwZSA9PT0gJ0V4cGVyaW1lbnRhbFJlc3RQcm9wZXJ0eScgfHwgZWxlbWVudC50eXBlID09PSAnUmVzdEVsZW1lbnQnKSB7XG4gICAgICAgIGNhbGxiYWNrKGVsZW1lbnQuYXJndW1lbnQpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICByZWN1cnNpdmVQYXR0ZXJuQ2FwdHVyZShlbGVtZW50LCBjYWxsYmFjayk7XG4gICAgfSk7XG4gICAgYnJlYWs7XG5cbiAgY2FzZSAnQXNzaWdubWVudFBhdHRlcm4nOlxuICAgIGNhbGxiYWNrKHBhdHRlcm4ubGVmdCk7XG4gICAgYnJlYWs7XG4gIH1cbn1cblxuLyoqXG4gKiBkb24ndCBob2xkIGZ1bGwgY29udGV4dCBvYmplY3QgaW4gbWVtb3J5LCBqdXN0IGdyYWIgd2hhdCB3ZSBuZWVkLlxuICovXG5mdW5jdGlvbiBjaGlsZENvbnRleHQocGF0aCwgY29udGV4dCkge1xuICBjb25zdCB7IHNldHRpbmdzLCBwYXJzZXJPcHRpb25zLCBwYXJzZXJQYXRoIH0gPSBjb250ZXh0O1xuICByZXR1cm4ge1xuICAgIHNldHRpbmdzLFxuICAgIHBhcnNlck9wdGlvbnMsXG4gICAgcGFyc2VyUGF0aCxcbiAgICBwYXRoLFxuICB9O1xufVxuXG5cbi8qKlxuICogc29tZXRpbWVzIGxlZ2FjeSBzdXBwb3J0IGlzbid0IF90aGF0XyBoYXJkLi4uIHJpZ2h0P1xuICovXG5mdW5jdGlvbiBtYWtlU291cmNlQ29kZSh0ZXh0LCBhc3QpIHtcbiAgaWYgKFNvdXJjZUNvZGUubGVuZ3RoID4gMSkge1xuICAgIC8vIEVTTGludCAzXG4gICAgcmV0dXJuIG5ldyBTb3VyY2VDb2RlKHRleHQsIGFzdCk7XG4gIH0gZWxzZSB7XG4gICAgLy8gRVNMaW50IDQsIDVcbiAgICByZXR1cm4gbmV3IFNvdXJjZUNvZGUoeyB0ZXh0LCBhc3QgfSk7XG4gIH1cbn1cbiJdfQ==