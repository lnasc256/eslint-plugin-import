'use strict';var _slicedToArray = function () {function sliceIterator(arr, i) {var _arr = [];var _n = true;var _d = false;var _e = undefined;try {for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {_arr.push(_s.value);if (i && _arr.length === i) break;}} catch (err) {_d = true;_e = err;} finally {try {if (!_n && _i["return"]) _i["return"]();} finally {if (_d) throw _e;}}return _arr;}return function (arr, i) {if (Array.isArray(arr)) {return arr;} else if (Symbol.iterator in Object(arr)) {return sliceIterator(arr, i);} else {throw new TypeError("Invalid attempt to destructure non-iterable instance");}};}();

var _minimatch = require('minimatch');var _minimatch2 = _interopRequireDefault(_minimatch);
var _arrayIncludes = require('array-includes');var _arrayIncludes2 = _interopRequireDefault(_arrayIncludes);

var _importType = require('../core/importType');var _importType2 = _interopRequireDefault(_importType);
var _staticRequire = require('../core/staticRequire');var _staticRequire2 = _interopRequireDefault(_staticRequire);
var _docsUrl = require('../docsUrl');var _docsUrl2 = _interopRequireDefault(_docsUrl);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { 'default': obj };}

var defaultGroups = ['builtin', 'external', 'parent', 'sibling', 'index'];

// REPORTING AND FIXING

function reverse(array) {
  return array.map(function (v) {
    return Object.assign({}, v, { rank: -v.rank });
  }).reverse();
}

function getTokensOrCommentsAfter(sourceCode, node, count) {
  var currentNodeOrToken = node;
  var result = [];
  for (var i = 0; i < count; i++) {
    currentNodeOrToken = sourceCode.getTokenOrCommentAfter(currentNodeOrToken);
    if (currentNodeOrToken == null) {
      break;
    }
    result.push(currentNodeOrToken);
  }
  return result;
}

function getTokensOrCommentsBefore(sourceCode, node, count) {
  var currentNodeOrToken = node;
  var result = [];
  for (var i = 0; i < count; i++) {
    currentNodeOrToken = sourceCode.getTokenOrCommentBefore(currentNodeOrToken);
    if (currentNodeOrToken == null) {
      break;
    }
    result.push(currentNodeOrToken);
  }
  return result.reverse();
}

function takeTokensAfterWhile(sourceCode, node, condition) {
  var tokens = getTokensOrCommentsAfter(sourceCode, node, 100);
  var result = [];
  for (var i = 0; i < tokens.length; i++) {
    if (condition(tokens[i])) {
      result.push(tokens[i]);
    } else {
      break;
    }
  }
  return result;
}

function takeTokensBeforeWhile(sourceCode, node, condition) {
  var tokens = getTokensOrCommentsBefore(sourceCode, node, 100);
  var result = [];
  for (var i = tokens.length - 1; i >= 0; i--) {
    if (condition(tokens[i])) {
      result.push(tokens[i]);
    } else {
      break;
    }
  }
  return result.reverse();
}

function findOutOfOrder(imported) {
  if (imported.length === 0) {
    return [];
  }
  var maxSeenRankNode = imported[0];
  return imported.filter(function (importedModule) {
    var res = importedModule.rank < maxSeenRankNode.rank;
    if (maxSeenRankNode.rank < importedModule.rank) {
      maxSeenRankNode = importedModule;
    }
    return res;
  });
}

function findRootNode(node) {
  var parent = node;
  while (parent.parent != null && parent.parent.body == null) {
    parent = parent.parent;
  }
  return parent;
}

function findEndOfLineWithComments(sourceCode, node) {
  var tokensToEndOfLine = takeTokensAfterWhile(sourceCode, node, commentOnSameLineAs(node));
  var endOfTokens = tokensToEndOfLine.length > 0 ?
  tokensToEndOfLine[tokensToEndOfLine.length - 1].range[1] :
  node.range[1];
  var result = endOfTokens;
  for (var i = endOfTokens; i < sourceCode.text.length; i++) {
    if (sourceCode.text[i] === '\n') {
      result = i + 1;
      break;
    }
    if (sourceCode.text[i] !== ' ' && sourceCode.text[i] !== '\t' && sourceCode.text[i] !== '\r') {
      break;
    }
    result = i + 1;
  }
  return result;
}

function commentOnSameLineAs(node) {
  return function (token) {return (token.type === 'Block' || token.type === 'Line') &&
    token.loc.start.line === token.loc.end.line &&
    token.loc.end.line === node.loc.end.line;};
}

function findStartOfLineWithComments(sourceCode, node) {
  var tokensToEndOfLine = takeTokensBeforeWhile(sourceCode, node, commentOnSameLineAs(node));
  var startOfTokens = tokensToEndOfLine.length > 0 ? tokensToEndOfLine[0].range[0] : node.range[0];
  var result = startOfTokens;
  for (var i = startOfTokens - 1; i > 0; i--) {
    if (sourceCode.text[i] !== ' ' && sourceCode.text[i] !== '\t') {
      break;
    }
    result = i;
  }
  return result;
}

function isPlainRequireModule(node) {
  if (node.type !== 'VariableDeclaration') {
    return false;
  }
  if (node.declarations.length !== 1) {
    return false;
  }
  var decl = node.declarations[0];
  var result = decl.id && (
  decl.id.type === 'Identifier' || decl.id.type === 'ObjectPattern') &&
  decl.init != null &&
  decl.init.type === 'CallExpression' &&
  decl.init.callee != null &&
  decl.init.callee.name === 'require' &&
  decl.init.arguments != null &&
  decl.init.arguments.length === 1 &&
  decl.init.arguments[0].type === 'Literal';
  return result;
}

function isPlainImportModule(node) {
  return node.type === 'ImportDeclaration' && node.specifiers != null && node.specifiers.length > 0;
}

function isPlainImportEquals(node) {
  return node.type === 'TSImportEqualsDeclaration' && node.moduleReference.expression;
}

function canCrossNodeWhileReorder(node) {
  return isPlainRequireModule(node) || isPlainImportModule(node) || isPlainImportEquals(node);
}

function canReorderItems(firstNode, secondNode) {
  var parent = firstNode.parent;var _sort =
  [
  parent.body.indexOf(firstNode),
  parent.body.indexOf(secondNode)].
  sort(),_sort2 = _slicedToArray(_sort, 2),firstIndex = _sort2[0],secondIndex = _sort2[1];
  var nodesBetween = parent.body.slice(firstIndex, secondIndex + 1);var _iteratorNormalCompletion = true;var _didIteratorError = false;var _iteratorError = undefined;try {
    for (var _iterator = nodesBetween[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {var nodeBetween = _step.value;
      if (!canCrossNodeWhileReorder(nodeBetween)) {
        return false;
      }
    }} catch (err) {_didIteratorError = true;_iteratorError = err;} finally {try {if (!_iteratorNormalCompletion && _iterator['return']) {_iterator['return']();}} finally {if (_didIteratorError) {throw _iteratorError;}}}
  return true;
}

function fixOutOfOrder(context, firstNode, secondNode, order) {
  var sourceCode = context.getSourceCode();

  var firstRoot = findRootNode(firstNode.node);
  var firstRootStart = findStartOfLineWithComments(sourceCode, firstRoot);
  var firstRootEnd = findEndOfLineWithComments(sourceCode, firstRoot);

  var secondRoot = findRootNode(secondNode.node);
  var secondRootStart = findStartOfLineWithComments(sourceCode, secondRoot);
  var secondRootEnd = findEndOfLineWithComments(sourceCode, secondRoot);
  var canFix = canReorderItems(firstRoot, secondRoot);

  var newCode = sourceCode.text.substring(secondRootStart, secondRootEnd);
  if (newCode[newCode.length - 1] !== '\n') {
    newCode = newCode + '\n';
  }

  var message = '`' + String(secondNode.displayName) + '` import should occur ' + String(order) + ' import of `' + String(firstNode.displayName) + '`';

  if (order === 'before') {
    context.report({
      node: secondNode.node,
      message: message,
      fix: canFix && function (fixer) {return (
          fixer.replaceTextRange(
          [firstRootStart, secondRootEnd],
          newCode + sourceCode.text.substring(firstRootStart, secondRootStart)));} });


  } else if (order === 'after') {
    context.report({
      node: secondNode.node,
      message: message,
      fix: canFix && function (fixer) {return (
          fixer.replaceTextRange(
          [secondRootStart, firstRootEnd],
          sourceCode.text.substring(secondRootEnd, firstRootEnd) + newCode));} });


  }
}

function reportOutOfOrder(context, imported, outOfOrder, order) {
  outOfOrder.forEach(function (imp) {
    var found = imported.find(function () {function hasHigherRank(importedItem) {
        return importedItem.rank > imp.rank;
      }return hasHigherRank;}());
    fixOutOfOrder(context, found, imp, order);
  });
}

function makeOutOfOrderReport(context, imported) {
  var outOfOrder = findOutOfOrder(imported);
  if (!outOfOrder.length) {
    return;
  }
  // There are things to report. Try to minimize the number of reported errors.
  var reversedImported = reverse(imported);
  var reversedOrder = findOutOfOrder(reversedImported);
  if (reversedOrder.length < outOfOrder.length) {
    reportOutOfOrder(context, reversedImported, reversedOrder, 'after');
    return;
  }
  reportOutOfOrder(context, imported, outOfOrder, 'before');
}

function getSorter(ascending) {
  var multiplier = ascending ? 1 : -1;

  return function () {function importsSorter(importA, importB) {
      var result = 0;

      if (!(0, _arrayIncludes2['default'])(importA, '/') && !(0, _arrayIncludes2['default'])(importB, '/')) {
        if (importA < importB) {
          result = -1;
        } else if (importA > importB) {
          result = 1;
        } else {
          result = 0;
        }
      } else {
        var A = importA.split('/');
        var B = importB.split('/');
        var a = A.length;
        var b = B.length;

        for (var i = 0; i < Math.min(a, b); i++) {
          if (A[i] < B[i]) {
            result = -1;
            break;
          } else if (A[i] > B[i]) {
            result = 1;
            break;
          }
        }

        if (!result && a !== b) {
          result = a < b ? -1 : 1;
        }
      }

      return result * multiplier;
    }return importsSorter;}();
}

function mutateRanksToAlphabetize(imported, alphabetizeOptions) {
  var groupedByRanks = imported.reduce(function (acc, importedItem) {
    if (!Array.isArray(acc[importedItem.rank])) {
      acc[importedItem.rank] = [];
    }
    acc[importedItem.rank].push(importedItem);
    return acc;
  }, {});

  var groupRanks = Object.keys(groupedByRanks);

  var sorterFn = getSorter(alphabetizeOptions.order === 'asc');
  var comparator = alphabetizeOptions.caseInsensitive ?
  function (a, b) {return sorterFn(String(a.value).toLowerCase(), String(b.value).toLowerCase());} :
  function (a, b) {return sorterFn(a.value, b.value);};

  // sort imports locally within their group
  groupRanks.forEach(function (groupRank) {
    groupedByRanks[groupRank].sort(comparator);
  });

  // assign globally unique rank to each import
  var newRank = 0;
  var alphabetizedRanks = groupRanks.sort().reduce(function (acc, groupRank) {
    groupedByRanks[groupRank].forEach(function (importedItem) {
      acc[String(importedItem.value) + '|' + String(importedItem.node.importKind)] = parseInt(groupRank, 10) + newRank;
      newRank += 1;
    });
    return acc;
  }, {});

  // mutate the original group-rank with alphabetized-rank
  imported.forEach(function (importedItem) {
    importedItem.rank = alphabetizedRanks[String(importedItem.value) + '|' + String(importedItem.node.importKind)];
  });
}

// DETECTING

function computePathRank(ranks, pathGroups, path, maxPosition) {
  for (var i = 0, l = pathGroups.length; i < l; i++) {var _pathGroups$i =
    pathGroups[i],pattern = _pathGroups$i.pattern,patternOptions = _pathGroups$i.patternOptions,group = _pathGroups$i.group,_pathGroups$i$positio = _pathGroups$i.position,position = _pathGroups$i$positio === undefined ? 1 : _pathGroups$i$positio;
    if ((0, _minimatch2['default'])(path, pattern, patternOptions || { nocomment: true })) {
      return ranks[group] + position / maxPosition;
    }
  }
}

function computeRank(context, ranks, importEntry, excludedImportTypes) {
  var impType = void 0;
  var rank = void 0;
  if (importEntry.type === 'import:object') {
    impType = 'object';
  } else if (importEntry.node.importKind === 'type' && ranks.omittedTypes.indexOf('type') === -1) {
    impType = 'type';
  } else {
    impType = (0, _importType2['default'])(importEntry.value, context);
  }
  if (!excludedImportTypes.has(impType)) {
    rank = computePathRank(ranks.groups, ranks.pathGroups, importEntry.value, ranks.maxPosition);
  }
  if (typeof rank === 'undefined') {
    rank = ranks.groups[impType];
  }
  if (importEntry.type !== 'import' && !importEntry.type.startsWith('import:')) {
    rank += 100;
  }

  return rank;
}

function registerNode(context, importEntry, ranks, imported, excludedImportTypes) {
  var rank = computeRank(context, ranks, importEntry, excludedImportTypes);
  if (rank !== -1) {
    imported.push(Object.assign({}, importEntry, { rank: rank }));
  }
}

function getRequireBlock(node) {
  var n = node;
  // Handle cases like `const baz = require('foo').bar.baz`
  // and `const foo = require('foo')()`
  while (
  n.parent.type === 'MemberExpression' && n.parent.object === n ||
  n.parent.type === 'CallExpression' && n.parent.callee === n)
  {
    n = n.parent;
  }
  if (
  n.parent.type === 'VariableDeclarator' &&
  n.parent.parent.type === 'VariableDeclaration' &&
  n.parent.parent.parent.type === 'Program')
  {
    return n.parent.parent.parent;
  }
}

var types = ['builtin', 'external', 'internal', 'unknown', 'parent', 'sibling', 'index', 'object', 'type'];

// Creates an object with type-rank pairs.
// Example: { index: 0, sibling: 1, parent: 1, external: 1, builtin: 2, internal: 2 }
// Will throw an error if it contains a type that does not exist, or has a duplicate
function convertGroupsToRanks(groups) {
  var rankObject = groups.reduce(function (res, group, index) {
    if (typeof group === 'string') {
      group = [group];
    }
    group.forEach(function (groupItem) {
      if (types.indexOf(groupItem) === -1) {
        throw new Error('Incorrect configuration of the rule: Unknown type `' +
        JSON.stringify(groupItem) + '`');
      }
      if (res[groupItem] !== undefined) {
        throw new Error('Incorrect configuration of the rule: `' + groupItem + '` is duplicated');
      }
      res[groupItem] = index;
    });
    return res;
  }, {});

  var omittedTypes = types.filter(function (type) {
    return rankObject[type] === undefined;
  });

  var ranks = omittedTypes.reduce(function (res, type) {
    res[type] = groups.length;
    return res;
  }, rankObject);

  return { groups: ranks, omittedTypes: omittedTypes };
}

function convertPathGroupsForRanks(pathGroups) {
  var after = {};
  var before = {};

  var transformed = pathGroups.map(function (pathGroup, index) {var
    group = pathGroup.group,positionString = pathGroup.position;
    var position = 0;
    if (positionString === 'after') {
      if (!after[group]) {
        after[group] = 1;
      }
      position = after[group]++;
    } else if (positionString === 'before') {
      if (!before[group]) {
        before[group] = [];
      }
      before[group].push(index);
    }

    return Object.assign({}, pathGroup, { position: position });
  });

  var maxPosition = 1;

  Object.keys(before).forEach(function (group) {
    var groupLength = before[group].length;
    before[group].forEach(function (groupIndex, index) {
      transformed[groupIndex].position = -1 * (groupLength - index);
    });
    maxPosition = Math.max(maxPosition, groupLength);
  });

  Object.keys(after).forEach(function (key) {
    var groupNextPosition = after[key];
    maxPosition = Math.max(maxPosition, groupNextPosition - 1);
  });

  return {
    pathGroups: transformed,
    maxPosition: maxPosition > 10 ? Math.pow(10, Math.ceil(Math.log10(maxPosition))) : 10 };

}

function fixNewLineAfterImport(context, previousImport) {
  var prevRoot = findRootNode(previousImport.node);
  var tokensToEndOfLine = takeTokensAfterWhile(
  context.getSourceCode(), prevRoot, commentOnSameLineAs(prevRoot));

  var endOfLine = prevRoot.range[1];
  if (tokensToEndOfLine.length > 0) {
    endOfLine = tokensToEndOfLine[tokensToEndOfLine.length - 1].range[1];
  }
  return function (fixer) {return fixer.insertTextAfterRange([prevRoot.range[0], endOfLine], '\n');};
}

function removeNewLineAfterImport(context, currentImport, previousImport) {
  var sourceCode = context.getSourceCode();
  var prevRoot = findRootNode(previousImport.node);
  var currRoot = findRootNode(currentImport.node);
  var rangeToRemove = [
  findEndOfLineWithComments(sourceCode, prevRoot),
  findStartOfLineWithComments(sourceCode, currRoot)];

  if (/^\s*$/.test(sourceCode.text.substring(rangeToRemove[0], rangeToRemove[1]))) {
    return function (fixer) {return fixer.removeRange(rangeToRemove);};
  }
  return undefined;
}

function makeNewlinesBetweenReport(context, imported, newlinesBetweenImports) {
  var getNumberOfEmptyLinesBetween = function getNumberOfEmptyLinesBetween(currentImport, previousImport) {
    var linesBetweenImports = context.getSourceCode().lines.slice(
    previousImport.node.loc.end.line,
    currentImport.node.loc.start.line - 1);


    return linesBetweenImports.filter(function (line) {return !line.trim().length;}).length;
  };
  var previousImport = imported[0];

  imported.slice(1).forEach(function (currentImport) {
    var emptyLinesBetween = getNumberOfEmptyLinesBetween(currentImport, previousImport);

    if (newlinesBetweenImports === 'always' ||
    newlinesBetweenImports === 'always-and-inside-groups') {
      if (currentImport.rank !== previousImport.rank && emptyLinesBetween === 0) {
        context.report({
          node: previousImport.node,
          message: 'There should be at least one empty line between import groups',
          fix: fixNewLineAfterImport(context, previousImport) });

      } else if (currentImport.rank === previousImport.rank &&
      emptyLinesBetween > 0 &&
      newlinesBetweenImports !== 'always-and-inside-groups') {
        context.report({
          node: previousImport.node,
          message: 'There should be no empty line within import group',
          fix: removeNewLineAfterImport(context, currentImport, previousImport) });

      }
    } else if (emptyLinesBetween > 0) {
      context.report({
        node: previousImport.node,
        message: 'There should be no empty line between import groups',
        fix: removeNewLineAfterImport(context, currentImport, previousImport) });

    }

    previousImport = currentImport;
  });
}

function getAlphabetizeConfig(options) {
  var alphabetize = options.alphabetize || {};
  var order = alphabetize.order || 'ignore';
  var caseInsensitive = alphabetize.caseInsensitive || false;

  return { order: order, caseInsensitive: caseInsensitive };
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      url: (0, _docsUrl2['default'])('order') },


    fixable: 'code',
    schema: [
    {
      type: 'object',
      properties: {
        groups: {
          type: 'array' },

        pathGroupsExcludedImportTypes: {
          type: 'array' },

        pathGroups: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string' },

              patternOptions: {
                type: 'object' },

              group: {
                type: 'string',
                'enum': types },

              position: {
                type: 'string',
                'enum': ['after', 'before'] } },


            required: ['pattern', 'group'] } },


        'newlines-between': {
          'enum': [
          'ignore',
          'always',
          'always-and-inside-groups',
          'never'] },


        alphabetize: {
          type: 'object',
          properties: {
            caseInsensitive: {
              type: 'boolean',
              'default': false },

            order: {
              'enum': ['ignore', 'asc', 'desc'],
              'default': 'ignore' } },


          additionalProperties: false },

        warnOnUnassignedImports: {
          type: 'boolean',
          'default': false } },


      additionalProperties: false }] },




  create: function () {function importOrderRule(context) {
      var options = context.options[0] || {};
      var newlinesBetweenImports = options['newlines-between'] || 'ignore';
      var pathGroupsExcludedImportTypes = new Set(options['pathGroupsExcludedImportTypes'] || ['builtin', 'external', 'object']);
      var alphabetize = getAlphabetizeConfig(options);
      var ranks = void 0;

      try {var _convertPathGroupsFor =
        convertPathGroupsForRanks(options.pathGroups || []),pathGroups = _convertPathGroupsFor.pathGroups,maxPosition = _convertPathGroupsFor.maxPosition;var _convertGroupsToRanks =
        convertGroupsToRanks(options.groups || defaultGroups),groups = _convertGroupsToRanks.groups,omittedTypes = _convertGroupsToRanks.omittedTypes;
        ranks = {
          groups: groups,
          omittedTypes: omittedTypes,
          pathGroups: pathGroups,
          maxPosition: maxPosition };

      } catch (error) {
        // Malformed configuration
        return {
          Program: function () {function Program(node) {
              context.report(node, error.message);
            }return Program;}() };

      }
      var importMap = new Map();

      function getBlockImports(node) {
        if (!importMap.has(node)) {
          importMap.set(node, []);
        }
        return importMap.get(node);
      }

      return {
        ImportDeclaration: function () {function handleImports(node) {
            // Ignoring unassigned imports unless warnOnUnassignedImports is set
            if (node.specifiers.length || options.warnOnUnassignedImports) {
              var name = node.source.value;
              registerNode(
              context,
              {
                node: node,
                value: name,
                displayName: name,
                type: 'import' },

              ranks,
              getBlockImports(node.parent),
              pathGroupsExcludedImportTypes);

            }
          }return handleImports;}(),
        TSImportEqualsDeclaration: function () {function handleImports(node) {
            var displayName = void 0;
            var value = void 0;
            var type = void 0;
            // skip "export import"s
            if (node.isExport) {
              return;
            }
            if (node.moduleReference.type === 'TSExternalModuleReference') {
              value = node.moduleReference.expression.value;
              displayName = value;
              type = 'import';
            } else {
              value = '';
              displayName = context.getSourceCode().getText(node.moduleReference);
              type = 'import:object';
            }
            registerNode(
            context,
            {
              node: node,
              value: value,
              displayName: displayName,
              type: type },

            ranks,
            getBlockImports(node.parent),
            pathGroupsExcludedImportTypes);

          }return handleImports;}(),
        CallExpression: function () {function handleRequires(node) {
            if (!(0, _staticRequire2['default'])(node)) {
              return;
            }
            var block = getRequireBlock(node);
            if (!block) {
              return;
            }
            var name = node.arguments[0].value;
            registerNode(
            context,
            {
              node: node,
              value: name,
              displayName: name,
              type: 'require' },

            ranks,
            getBlockImports(block),
            pathGroupsExcludedImportTypes);

          }return handleRequires;}(),
        'Program:exit': function () {function reportAndReset() {
            importMap.forEach(function (imported) {
              if (newlinesBetweenImports !== 'ignore') {
                makeNewlinesBetweenReport(context, imported, newlinesBetweenImports);
              }

              if (alphabetize.order !== 'ignore') {
                mutateRanksToAlphabetize(imported, alphabetize);
              }

              makeOutOfOrderReport(context, imported);
            });

            importMap.clear();
          }return reportAndReset;}() };

    }return importOrderRule;}() };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ydWxlcy9vcmRlci5qcyJdLCJuYW1lcyI6WyJkZWZhdWx0R3JvdXBzIiwicmV2ZXJzZSIsImFycmF5IiwibWFwIiwidiIsIk9iamVjdCIsImFzc2lnbiIsInJhbmsiLCJnZXRUb2tlbnNPckNvbW1lbnRzQWZ0ZXIiLCJzb3VyY2VDb2RlIiwibm9kZSIsImNvdW50IiwiY3VycmVudE5vZGVPclRva2VuIiwicmVzdWx0IiwiaSIsImdldFRva2VuT3JDb21tZW50QWZ0ZXIiLCJwdXNoIiwiZ2V0VG9rZW5zT3JDb21tZW50c0JlZm9yZSIsImdldFRva2VuT3JDb21tZW50QmVmb3JlIiwidGFrZVRva2Vuc0FmdGVyV2hpbGUiLCJjb25kaXRpb24iLCJ0b2tlbnMiLCJsZW5ndGgiLCJ0YWtlVG9rZW5zQmVmb3JlV2hpbGUiLCJmaW5kT3V0T2ZPcmRlciIsImltcG9ydGVkIiwibWF4U2VlblJhbmtOb2RlIiwiZmlsdGVyIiwiaW1wb3J0ZWRNb2R1bGUiLCJyZXMiLCJmaW5kUm9vdE5vZGUiLCJwYXJlbnQiLCJib2R5IiwiZmluZEVuZE9mTGluZVdpdGhDb21tZW50cyIsInRva2Vuc1RvRW5kT2ZMaW5lIiwiY29tbWVudE9uU2FtZUxpbmVBcyIsImVuZE9mVG9rZW5zIiwicmFuZ2UiLCJ0ZXh0IiwidG9rZW4iLCJ0eXBlIiwibG9jIiwic3RhcnQiLCJsaW5lIiwiZW5kIiwiZmluZFN0YXJ0T2ZMaW5lV2l0aENvbW1lbnRzIiwic3RhcnRPZlRva2VucyIsImlzUGxhaW5SZXF1aXJlTW9kdWxlIiwiZGVjbGFyYXRpb25zIiwiZGVjbCIsImlkIiwiaW5pdCIsImNhbGxlZSIsIm5hbWUiLCJhcmd1bWVudHMiLCJpc1BsYWluSW1wb3J0TW9kdWxlIiwic3BlY2lmaWVycyIsImlzUGxhaW5JbXBvcnRFcXVhbHMiLCJtb2R1bGVSZWZlcmVuY2UiLCJleHByZXNzaW9uIiwiY2FuQ3Jvc3NOb2RlV2hpbGVSZW9yZGVyIiwiY2FuUmVvcmRlckl0ZW1zIiwiZmlyc3ROb2RlIiwic2Vjb25kTm9kZSIsImluZGV4T2YiLCJzb3J0IiwiZmlyc3RJbmRleCIsInNlY29uZEluZGV4Iiwibm9kZXNCZXR3ZWVuIiwic2xpY2UiLCJub2RlQmV0d2VlbiIsImZpeE91dE9mT3JkZXIiLCJjb250ZXh0Iiwib3JkZXIiLCJnZXRTb3VyY2VDb2RlIiwiZmlyc3RSb290IiwiZmlyc3RSb290U3RhcnQiLCJmaXJzdFJvb3RFbmQiLCJzZWNvbmRSb290Iiwic2Vjb25kUm9vdFN0YXJ0Iiwic2Vjb25kUm9vdEVuZCIsImNhbkZpeCIsIm5ld0NvZGUiLCJzdWJzdHJpbmciLCJtZXNzYWdlIiwiZGlzcGxheU5hbWUiLCJyZXBvcnQiLCJmaXgiLCJmaXhlciIsInJlcGxhY2VUZXh0UmFuZ2UiLCJyZXBvcnRPdXRPZk9yZGVyIiwib3V0T2ZPcmRlciIsImZvckVhY2giLCJpbXAiLCJmb3VuZCIsImZpbmQiLCJoYXNIaWdoZXJSYW5rIiwiaW1wb3J0ZWRJdGVtIiwibWFrZU91dE9mT3JkZXJSZXBvcnQiLCJyZXZlcnNlZEltcG9ydGVkIiwicmV2ZXJzZWRPcmRlciIsImdldFNvcnRlciIsImFzY2VuZGluZyIsIm11bHRpcGxpZXIiLCJpbXBvcnRzU29ydGVyIiwiaW1wb3J0QSIsImltcG9ydEIiLCJBIiwic3BsaXQiLCJCIiwiYSIsImIiLCJNYXRoIiwibWluIiwibXV0YXRlUmFua3NUb0FscGhhYmV0aXplIiwiYWxwaGFiZXRpemVPcHRpb25zIiwiZ3JvdXBlZEJ5UmFua3MiLCJyZWR1Y2UiLCJhY2MiLCJBcnJheSIsImlzQXJyYXkiLCJncm91cFJhbmtzIiwia2V5cyIsInNvcnRlckZuIiwiY29tcGFyYXRvciIsImNhc2VJbnNlbnNpdGl2ZSIsIlN0cmluZyIsInZhbHVlIiwidG9Mb3dlckNhc2UiLCJncm91cFJhbmsiLCJuZXdSYW5rIiwiYWxwaGFiZXRpemVkUmFua3MiLCJpbXBvcnRLaW5kIiwicGFyc2VJbnQiLCJjb21wdXRlUGF0aFJhbmsiLCJyYW5rcyIsInBhdGhHcm91cHMiLCJwYXRoIiwibWF4UG9zaXRpb24iLCJsIiwicGF0dGVybiIsInBhdHRlcm5PcHRpb25zIiwiZ3JvdXAiLCJwb3NpdGlvbiIsIm5vY29tbWVudCIsImNvbXB1dGVSYW5rIiwiaW1wb3J0RW50cnkiLCJleGNsdWRlZEltcG9ydFR5cGVzIiwiaW1wVHlwZSIsIm9taXR0ZWRUeXBlcyIsImhhcyIsImdyb3VwcyIsInN0YXJ0c1dpdGgiLCJyZWdpc3Rlck5vZGUiLCJnZXRSZXF1aXJlQmxvY2siLCJuIiwib2JqZWN0IiwidHlwZXMiLCJjb252ZXJ0R3JvdXBzVG9SYW5rcyIsInJhbmtPYmplY3QiLCJpbmRleCIsImdyb3VwSXRlbSIsIkVycm9yIiwiSlNPTiIsInN0cmluZ2lmeSIsInVuZGVmaW5lZCIsImNvbnZlcnRQYXRoR3JvdXBzRm9yUmFua3MiLCJhZnRlciIsImJlZm9yZSIsInRyYW5zZm9ybWVkIiwicGF0aEdyb3VwIiwicG9zaXRpb25TdHJpbmciLCJncm91cExlbmd0aCIsImdyb3VwSW5kZXgiLCJtYXgiLCJrZXkiLCJncm91cE5leHRQb3NpdGlvbiIsInBvdyIsImNlaWwiLCJsb2cxMCIsImZpeE5ld0xpbmVBZnRlckltcG9ydCIsInByZXZpb3VzSW1wb3J0IiwicHJldlJvb3QiLCJlbmRPZkxpbmUiLCJpbnNlcnRUZXh0QWZ0ZXJSYW5nZSIsInJlbW92ZU5ld0xpbmVBZnRlckltcG9ydCIsImN1cnJlbnRJbXBvcnQiLCJjdXJyUm9vdCIsInJhbmdlVG9SZW1vdmUiLCJ0ZXN0IiwicmVtb3ZlUmFuZ2UiLCJtYWtlTmV3bGluZXNCZXR3ZWVuUmVwb3J0IiwibmV3bGluZXNCZXR3ZWVuSW1wb3J0cyIsImdldE51bWJlck9mRW1wdHlMaW5lc0JldHdlZW4iLCJsaW5lc0JldHdlZW5JbXBvcnRzIiwibGluZXMiLCJ0cmltIiwiZW1wdHlMaW5lc0JldHdlZW4iLCJnZXRBbHBoYWJldGl6ZUNvbmZpZyIsIm9wdGlvbnMiLCJhbHBoYWJldGl6ZSIsIm1vZHVsZSIsImV4cG9ydHMiLCJtZXRhIiwiZG9jcyIsInVybCIsImZpeGFibGUiLCJzY2hlbWEiLCJwcm9wZXJ0aWVzIiwicGF0aEdyb3Vwc0V4Y2x1ZGVkSW1wb3J0VHlwZXMiLCJpdGVtcyIsInJlcXVpcmVkIiwiYWRkaXRpb25hbFByb3BlcnRpZXMiLCJ3YXJuT25VbmFzc2lnbmVkSW1wb3J0cyIsImNyZWF0ZSIsImltcG9ydE9yZGVyUnVsZSIsIlNldCIsImVycm9yIiwiUHJvZ3JhbSIsImltcG9ydE1hcCIsIk1hcCIsImdldEJsb2NrSW1wb3J0cyIsInNldCIsImdldCIsIkltcG9ydERlY2xhcmF0aW9uIiwiaGFuZGxlSW1wb3J0cyIsInNvdXJjZSIsIlRTSW1wb3J0RXF1YWxzRGVjbGFyYXRpb24iLCJpc0V4cG9ydCIsImdldFRleHQiLCJDYWxsRXhwcmVzc2lvbiIsImhhbmRsZVJlcXVpcmVzIiwiYmxvY2siLCJyZXBvcnRBbmRSZXNldCIsImNsZWFyIl0sIm1hcHBpbmdzIjoiQUFBQSxhOztBQUVBLHNDO0FBQ0EsK0M7O0FBRUEsZ0Q7QUFDQSxzRDtBQUNBLHFDOztBQUVBLElBQU1BLGdCQUFnQixDQUFDLFNBQUQsRUFBWSxVQUFaLEVBQXdCLFFBQXhCLEVBQWtDLFNBQWxDLEVBQTZDLE9BQTdDLENBQXRCOztBQUVBOztBQUVBLFNBQVNDLE9BQVQsQ0FBaUJDLEtBQWpCLEVBQXdCO0FBQ3RCLFNBQU9BLE1BQU1DLEdBQU4sQ0FBVSxVQUFVQyxDQUFWLEVBQWE7QUFDNUIsV0FBT0MsT0FBT0MsTUFBUCxDQUFjLEVBQWQsRUFBa0JGLENBQWxCLEVBQXFCLEVBQUVHLE1BQU0sQ0FBQ0gsRUFBRUcsSUFBWCxFQUFyQixDQUFQO0FBQ0QsR0FGTSxFQUVKTixPQUZJLEVBQVA7QUFHRDs7QUFFRCxTQUFTTyx3QkFBVCxDQUFrQ0MsVUFBbEMsRUFBOENDLElBQTlDLEVBQW9EQyxLQUFwRCxFQUEyRDtBQUN6RCxNQUFJQyxxQkFBcUJGLElBQXpCO0FBQ0EsTUFBTUcsU0FBUyxFQUFmO0FBQ0EsT0FBSyxJQUFJQyxJQUFJLENBQWIsRUFBZ0JBLElBQUlILEtB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Q0FBZ0IsU0FBU0MsY0FBVCxDQUF3QjdOLElBQXhCLEVBQThCO0FBQzVDLGdCQUFJLENBQUMsZ0NBQWdCQSxJQUFoQixDQUFMLEVBQTRCO0FBQzFCO0FBQ0Q7QUFDRCxnQkFBTThOLFFBQVE5RSxnQkFBZ0JoSixJQUFoQixDQUFkO0FBQ0EsZ0JBQUksQ0FBQzhOLEtBQUwsRUFBWTtBQUNWO0FBQ0Q7QUFDRCxnQkFBTW5MLE9BQU8zQyxLQUFLNEMsU0FBTCxDQUFlLENBQWYsRUFBa0J5RSxLQUEvQjtBQUNBMEI7QUFDRWpGLG1CQURGO0FBRUU7QUFDRTlELHdCQURGO0FBRUVxSCxxQkFBTzFFLElBRlQ7QUFHRWdDLDJCQUFhaEMsSUFIZjtBQUlFYixvQkFBTSxTQUpSLEVBRkY7O0FBUUUrRixpQkFSRjtBQVNFc0YsNEJBQWdCVyxLQUFoQixDQVRGO0FBVUV2Qix5Q0FWRjs7QUFZRCxXQXJCRCxPQUF5QnNCLGNBQXpCLElBakRLO0FBdUVMLHFDQUFnQixTQUFTRSxjQUFULEdBQTBCO0FBQ3hDZCxzQkFBVS9ILE9BQVYsQ0FBa0IsVUFBQ25FLFFBQUQsRUFBYztBQUM5QixrQkFBSXVLLDJCQUEyQixRQUEvQixFQUF5QztBQUN2Q0QsMENBQTBCdkgsT0FBMUIsRUFBbUMvQyxRQUFuQyxFQUE2Q3VLLHNCQUE3QztBQUNEOztBQUVELGtCQUFJUSxZQUFZL0gsS0FBWixLQUFzQixRQUExQixFQUFvQztBQUNsQ3lDLHlDQUF5QnpGLFFBQXpCLEVBQW1DK0ssV0FBbkM7QUFDRDs7QUFFRHRHLG1DQUFxQjFCLE9BQXJCLEVBQThCL0MsUUFBOUI7QUFDRCxhQVZEOztBQVlBa00sc0JBQVVlLEtBQVY7QUFDRCxXQWRELE9BQXlCRCxjQUF6QixJQXZFSyxFQUFQOztBQXVGRCxLQXhIRCxPQUFpQmxCLGVBQWpCLElBekVlLEVBQWpCIiwiZmlsZSI6Im9yZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgbWluaW1hdGNoIGZyb20gJ21pbmltYXRjaCc7XG5pbXBvcnQgaW5jbHVkZXMgZnJvbSAnYXJyYXktaW5jbHVkZXMnO1xuXG5pbXBvcnQgaW1wb3J0VHlwZSBmcm9tICcuLi9jb3JlL2ltcG9ydFR5cGUnO1xuaW1wb3J0IGlzU3RhdGljUmVxdWlyZSBmcm9tICcuLi9jb3JlL3N0YXRpY1JlcXVpcmUnO1xuaW1wb3J0IGRvY3NVcmwgZnJvbSAnLi4vZG9jc1VybCc7XG5cbmNvbnN0IGRlZmF1bHRHcm91cHMgPSBbJ2J1aWx0aW4nLCAnZXh0ZXJuYWwnLCAncGFyZW50JywgJ3NpYmxpbmcnLCAnaW5kZXgnXTtcblxuLy8gUkVQT1JUSU5HIEFORCBGSVhJTkdcblxuZnVuY3Rpb24gcmV2ZXJzZShhcnJheSkge1xuICByZXR1cm4gYXJyYXkubWFwKGZ1bmN0aW9uICh2KSB7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIHYsIHsgcmFuazogLXYucmFuayB9KTtcbiAgfSkucmV2ZXJzZSgpO1xufVxuXG5mdW5jdGlvbiBnZXRUb2tlbnNPckNvbW1lbnRzQWZ0ZXIoc291cmNlQ29kZSwgbm9kZSwgY291bnQpIHtcbiAgbGV0IGN1cnJlbnROb2RlT3JUb2tlbiA9IG5vZGU7XG4gIGNvbnN0IHJlc3VsdCA9IFtdO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICBjdXJyZW50Tm9kZU9yVG9rZW4gPSBzb3VyY2VDb2RlLmdldFRva2VuT3JDb21tZW50QWZ0ZXIoY3VycmVudE5vZGVPclRva2VuKTtcbiAgICBpZiAoY3VycmVudE5vZGVPclRva2VuID09IG51bGwpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICByZXN1bHQucHVzaChjdXJyZW50Tm9kZU9yVG9rZW4pO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGdldFRva2Vuc09yQ29tbWVudHNCZWZvcmUoc291cmNlQ29kZSwgbm9kZSwgY291bnQpIHtcbiAgbGV0IGN1cnJlbnROb2RlT3JUb2tlbiA9IG5vZGU7XG4gIGNvbnN0IHJlc3VsdCA9IFtdO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICBjdXJyZW50Tm9kZU9yVG9rZW4gPSBzb3VyY2VDb2RlLmdldFRva2VuT3JDb21tZW50QmVmb3JlKGN1cnJlbnROb2RlT3JUb2tlbik7XG4gICAgaWYgKGN1cnJlbnROb2RlT3JUb2tlbiA9PSBudWxsKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgcmVzdWx0LnB1c2goY3VycmVudE5vZGVPclRva2VuKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0LnJldmVyc2UoKTtcbn1cblxuZnVuY3Rpb24gdGFrZVRva2Vuc0FmdGVyV2hpbGUoc291cmNlQ29kZSwgbm9kZSwgY29uZGl0aW9uKSB7XG4gIGNvbnN0IHRva2VucyA9IGdldFRva2Vuc09yQ29tbWVudHNBZnRlcihzb3VyY2VDb2RlLCBub2RlLCAxMDApO1xuICBjb25zdCByZXN1bHQgPSBbXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b2tlbnMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoY29uZGl0aW9uKHRva2Vuc1tpXSkpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHRva2Vuc1tpXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiB0YWtlVG9rZW5zQmVmb3JlV2hpbGUoc291cmNlQ29kZSwgbm9kZSwgY29uZGl0aW9uKSB7XG4gIGNvbnN0IHRva2VucyA9IGdldFRva2Vuc09yQ29tbWVudHNCZWZvcmUoc291cmNlQ29kZSwgbm9kZSwgMTAwKTtcbiAgY29uc3QgcmVzdWx0ID0gW107XG4gIGZvciAobGV0IGkgPSB0b2tlbnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBpZiAoY29uZGl0aW9uKHRva2Vuc1tpXSkpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHRva2Vuc1tpXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0LnJldmVyc2UoKTtcbn1cblxuZnVuY3Rpb24gZmluZE91dE9mT3JkZXIoaW1wb3J0ZWQpIHtcbiAgaWYgKGltcG9ydGVkLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuICBsZXQgbWF4U2VlblJhbmtOb2RlID0gaW1wb3J0ZWRbMF07XG4gIHJldHVybiBpbXBvcnRlZC5maWx0ZXIoZnVuY3Rpb24gKGltcG9ydGVkTW9kdWxlKSB7XG4gICAgY29uc3QgcmVzID0gaW1wb3J0ZWRNb2R1bGUucmFuayA8IG1heFNlZW5SYW5rTm9kZS5yYW5rO1xuICAgIGlmIChtYXhTZWVuUmFua05vZGUucmFuayA8IGltcG9ydGVkTW9kdWxlLnJhbmspIHtcbiAgICAgIG1heFNlZW5SYW5rTm9kZSA9IGltcG9ydGVkTW9kdWxlO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZmluZFJvb3ROb2RlKG5vZGUpIHtcbiAgbGV0IHBhcmVudCA9IG5vZGU7XG4gIHdoaWxlIChwYXJlbnQucGFyZW50ICE9IG51bGwgJiYgcGFyZW50LnBhcmVudC5ib2R5ID09IG51bGwpIHtcbiAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50O1xuICB9XG4gIHJldHVybiBwYXJlbnQ7XG59XG5cbmZ1bmN0aW9uIGZpbmRFbmRPZkxpbmVXaXRoQ29tbWVudHMoc291cmNlQ29kZSwgbm9kZSkge1xuICBjb25zdCB0b2tlbnNUb0VuZE9mTGluZSA9IHRha2VUb2tlbnNBZnRlcldoaWxlKHNvdXJjZUNvZGUsIG5vZGUsIGNvbW1lbnRPblNhbWVMaW5lQXMobm9kZSkpO1xuICBjb25zdCBlbmRPZlRva2VucyA9IHRva2Vuc1RvRW5kT2ZMaW5lLmxlbmd0aCA+IDBcbiAgICA/IHRva2Vuc1RvRW5kT2ZMaW5lW3Rva2Vuc1RvRW5kT2ZMaW5lLmxlbmd0aCAtIDFdLnJhbmdlWzFdXG4gICAgOiBub2RlLnJhbmdlWzFdO1xuICBsZXQgcmVzdWx0ID0gZW5kT2ZUb2tlbnM7XG4gIGZvciAobGV0IGkgPSBlbmRPZlRva2VuczsgaSA8IHNvdXJjZUNvZGUudGV4dC5sZW5ndGg7IGkrKykge1xuICAgIGlmIChzb3VyY2VDb2RlLnRleHRbaV0gPT09ICdcXG4nKSB7XG4gICAgICByZXN1bHQgPSBpICsgMTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBpZiAoc291cmNlQ29kZS50ZXh0W2ldICE9PSAnICcgJiYgc291cmNlQ29kZS50ZXh0W2ldICE9PSAnXFx0JyAmJiBzb3VyY2VDb2RlLnRleHRbaV0gIT09ICdcXHInKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgcmVzdWx0ID0gaSArIDE7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gY29tbWVudE9uU2FtZUxpbmVBcyhub2RlKSB7XG4gIHJldHVybiB0b2tlbiA9PiAodG9rZW4udHlwZSA9PT0gJ0Jsb2NrJyB8fCAgdG9rZW4udHlwZSA9PT0gJ0xpbmUnKSAmJlxuICAgICAgdG9rZW4ubG9jLnN0YXJ0LmxpbmUgPT09IHRva2VuLmxvYy5lbmQubGluZSAmJlxuICAgICAgdG9rZW4ubG9jLmVuZC5saW5lID09PSBub2RlLmxvYy5lbmQubGluZTtcbn1cblxuZnVuY3Rpb24gZmluZFN0YXJ0T2ZMaW5lV2l0aENvbW1lbnRzKHNvdXJjZUNvZGUsIG5vZGUpIHtcbiAgY29uc3QgdG9rZW5zVG9FbmRPZkxpbmUgPSB0YWtlVG9rZW5zQmVmb3JlV2hpbGUoc291cmNlQ29kZSwgbm9kZSwgY29tbWVudE9uU2FtZUxpbmVBcyhub2RlKSk7XG4gIGNvbnN0IHN0YXJ0T2ZUb2tlbnMgPSB0b2tlbnNUb0VuZE9mTGluZS5sZW5ndGggPiAwID8gdG9rZW5zVG9FbmRPZkxpbmVbMF0ucmFuZ2VbMF0gOiBub2RlLnJhbmdlWzBdO1xuICBsZXQgcmVzdWx0ID0gc3RhcnRPZlRva2VucztcbiAgZm9yIChsZXQgaSA9IHN0YXJ0T2ZUb2tlbnMgLSAxOyBpID4gMDsgaS0tKSB7XG4gICAgaWYgKHNvdXJjZUNvZGUudGV4dFtpXSAhPT0gJyAnICYmIHNvdXJjZUNvZGUudGV4dFtpXSAhPT0gJ1xcdCcpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICByZXN1bHQgPSBpO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGlzUGxhaW5SZXF1aXJlTW9kdWxlKG5vZGUpIHtcbiAgaWYgKG5vZGUudHlwZSAhPT0gJ1ZhcmlhYmxlRGVjbGFyYXRpb24nKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChub2RlLmRlY2xhcmF0aW9ucy5sZW5ndGggIT09IDEpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgY29uc3QgZGVjbCA9IG5vZGUuZGVjbGFyYXRpb25zWzBdO1xuICBjb25zdCByZXN1bHQgPSBkZWNsLmlkICYmXG4gICAgKGRlY2wuaWQudHlwZSA9PT0gJ0lkZW50aWZpZXInIHx8IGRlY2wuaWQudHlwZSA9PT0gJ09iamVjdFBhdHRlcm4nKSAmJlxuICAgIGRlY2wuaW5pdCAhPSBudWxsICYmXG4gICAgZGVjbC5pbml0LnR5cGUgPT09ICdDYWxsRXhwcmVzc2lvbicgJiZcbiAgICBkZWNsLmluaXQuY2FsbGVlICE9IG51bGwgJiZcbiAgICBkZWNsLmluaXQuY2FsbGVlLm5hbWUgPT09ICdyZXF1aXJlJyAmJlxuICAgIGRlY2wuaW5pdC5hcmd1bWVudHMgIT0gbnVsbCAmJlxuICAgIGRlY2wuaW5pdC5hcmd1bWVudHMubGVuZ3RoID09PSAxICYmXG4gICAgZGVjbC5pbml0LmFyZ3VtZW50c1swXS50eXBlID09PSAnTGl0ZXJhbCc7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGlzUGxhaW5JbXBvcnRNb2R1bGUobm9kZSkge1xuICByZXR1cm4gbm9kZS50eXBlID09PSAnSW1wb3J0RGVjbGFyYXRpb24nICYmIG5vZGUuc3BlY2lmaWVycyAhPSBudWxsICYmIG5vZGUuc3BlY2lmaWVycy5sZW5ndGggPiAwO1xufVxuXG5mdW5jdGlvbiBpc1BsYWluSW1wb3J0RXF1YWxzKG5vZGUpIHtcbiAgcmV0dXJuIG5vZGUudHlwZSA9PT0gJ1RTSW1wb3J0RXF1YWxzRGVjbGFyYXRpb24nICYmIG5vZGUubW9kdWxlUmVmZXJlbmNlLmV4cHJlc3Npb247XG59XG5cbmZ1bmN0aW9uIGNhbkNyb3NzTm9kZVdoaWxlUmVvcmRlcihub2RlKSB7XG4gIHJldHVybiBpc1BsYWluUmVxdWlyZU1vZHVsZShub2RlKSB8fCBpc1BsYWluSW1wb3J0TW9kdWxlKG5vZGUpIHx8IGlzUGxhaW5JbXBvcnRFcXVhbHMobm9kZSk7XG59XG5cbmZ1bmN0aW9uIGNhblJlb3JkZXJJdGVtcyhmaXJzdE5vZGUsIHNlY29uZE5vZGUpIHtcbiAgY29uc3QgcGFyZW50ID0gZmlyc3ROb2RlLnBhcmVudDtcbiAgY29uc3QgW2ZpcnN0SW5kZXgsIHNlY29uZEluZGV4XSA9IFtcbiAgICBwYXJlbnQuYm9keS5pbmRleE9mKGZpcnN0Tm9kZSksXG4gICAgcGFyZW50LmJvZHkuaW5kZXhPZihzZWNvbmROb2RlKSxcbiAgXS5zb3J0KCk7XG4gIGNvbnN0IG5vZGVzQmV0d2VlbiA9IHBhcmVudC5ib2R5LnNsaWNlKGZpcnN0SW5kZXgsIHNlY29uZEluZGV4ICsgMSk7XG4gIGZvciAoY29uc3Qgbm9kZUJldHdlZW4gb2Ygbm9kZXNCZXR3ZWVuKSB7XG4gICAgaWYgKCFjYW5Dcm9zc05vZGVXaGlsZVJlb3JkZXIobm9kZUJldHdlZW4pKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBmaXhPdXRPZk9yZGVyKGNvbnRleHQsIGZpcnN0Tm9kZSwgc2Vjb25kTm9kZSwgb3JkZXIpIHtcbiAgY29uc3Qgc291cmNlQ29kZSA9IGNvbnRleHQuZ2V0U291cmNlQ29kZSgpO1xuXG4gIGNvbnN0IGZpcnN0Um9vdCA9IGZpbmRSb290Tm9kZShmaXJzdE5vZGUubm9kZSk7XG4gIGNvbnN0IGZpcnN0Um9vdFN0YXJ0ID0gZmluZFN0YXJ0T2ZMaW5lV2l0aENvbW1lbnRzKHNvdXJjZUNvZGUsIGZpcnN0Um9vdCk7XG4gIGNvbnN0IGZpcnN0Um9vdEVuZCA9IGZpbmRFbmRPZkxpbmVXaXRoQ29tbWVudHMoc291cmNlQ29kZSwgZmlyc3RSb290KTtcblxuICBjb25zdCBzZWNvbmRSb290ID0gZmluZFJvb3ROb2RlKHNlY29uZE5vZGUubm9kZSk7XG4gIGNvbnN0IHNlY29uZFJvb3RTdGFydCA9IGZpbmRTdGFydE9mTGluZVdpdGhDb21tZW50cyhzb3VyY2VDb2RlLCBzZWNvbmRSb290KTtcbiAgY29uc3Qgc2Vjb25kUm9vdEVuZCA9IGZpbmRFbmRPZkxpbmVXaXRoQ29tbWVudHMoc291cmNlQ29kZSwgc2Vjb25kUm9vdCk7XG4gIGNvbnN0IGNhbkZpeCA9IGNhblJlb3JkZXJJdGVtcyhmaXJzdFJvb3QsIHNlY29uZFJvb3QpO1xuXG4gIGxldCBuZXdDb2RlID0gc291cmNlQ29kZS50ZXh0LnN1YnN0cmluZyhzZWNvbmRSb290U3RhcnQsIHNlY29uZFJvb3RFbmQpO1xuICBpZiAobmV3Q29kZVtuZXdDb2RlLmxlbmd0aCAtIDFdICE9PSAnXFxuJykge1xuICAgIG5ld0NvZGUgPSBuZXdDb2RlICsgJ1xcbic7XG4gIH1cblxuICBjb25zdCBtZXNzYWdlID0gYFxcYCR7c2Vjb25kTm9kZS5kaXNwbGF5TmFtZX1cXGAgaW1wb3J0IHNob3VsZCBvY2N1ciAke29yZGVyfSBpbXBvcnQgb2YgXFxgJHtmaXJzdE5vZGUuZGlzcGxheU5hbWV9XFxgYDtcblxuICBpZiAob3JkZXIgPT09ICdiZWZvcmUnKSB7XG4gICAgY29udGV4dC5yZXBvcnQoe1xuICAgICAgbm9kZTogc2Vjb25kTm9kZS5ub2RlLFxuICAgICAgbWVzc2FnZSxcbiAgICAgIGZpeDogY2FuRml4ICYmIChmaXhlciA9PlxuICAgICAgICBmaXhlci5yZXBsYWNlVGV4dFJhbmdlKFxuICAgICAgICAgIFtmaXJzdFJvb3RTdGFydCwgc2Vjb25kUm9vdEVuZF0sXG4gICAgICAgICAgbmV3Q29kZSArIHNvdXJjZUNvZGUudGV4dC5zdWJzdHJpbmcoZmlyc3RSb290U3RhcnQsIHNlY29uZFJvb3RTdGFydCksXG4gICAgICAgICkpLFxuICAgIH0pO1xuICB9IGVsc2UgaWYgKG9yZGVyID09PSAnYWZ0ZXInKSB7XG4gICAgY29udGV4dC5yZXBvcnQoe1xuICAgICAgbm9kZTogc2Vjb25kTm9kZS5ub2RlLFxuICAgICAgbWVzc2FnZSxcbiAgICAgIGZpeDogY2FuRml4ICYmIChmaXhlciA9PlxuICAgICAgICBmaXhlci5yZXBsYWNlVGV4dFJhbmdlKFxuICAgICAgICAgIFtzZWNvbmRSb290U3RhcnQsIGZpcnN0Um9vdEVuZF0sXG4gICAgICAgICAgc291cmNlQ29kZS50ZXh0LnN1YnN0cmluZyhzZWNvbmRSb290RW5kLCBmaXJzdFJvb3RFbmQpICsgbmV3Q29kZSxcbiAgICAgICAgKSksXG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVwb3J0T3V0T2ZPcmRlcihjb250ZXh0LCBpbXBvcnRlZCwgb3V0T2ZPcmRlciwgb3JkZXIpIHtcbiAgb3V0T2ZPcmRlci5mb3JFYWNoKGZ1bmN0aW9uIChpbXApIHtcbiAgICBjb25zdCBmb3VuZCA9IGltcG9ydGVkLmZpbmQoZnVuY3Rpb24gaGFzSGlnaGVyUmFuayhpbXBvcnRlZEl0ZW0pIHtcbiAgICAgIHJldHVybiBpbXBvcnRlZEl0ZW0ucmFuayA+IGltcC5yYW5rO1xuICAgIH0pO1xuICAgIGZpeE91dE9mT3JkZXIoY29udGV4dCwgZm91bmQsIGltcCwgb3JkZXIpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gbWFrZU91dE9mT3JkZXJSZXBvcnQoY29udGV4dCwgaW1wb3J0ZWQpIHtcbiAgY29uc3Qgb3V0T2ZPcmRlciA9IGZpbmRPdXRPZk9yZGVyKGltcG9ydGVkKTtcbiAgaWYgKCFvdXRPZk9yZGVyLmxlbmd0aCkge1xuICAgIHJldHVybjtcbiAgfVxuICAvLyBUaGVyZSBhcmUgdGhpbmdzIHRvIHJlcG9ydC4gVHJ5IHRvIG1pbmltaXplIHRoZSBudW1iZXIgb2YgcmVwb3J0ZWQgZXJyb3JzLlxuICBjb25zdCByZXZlcnNlZEltcG9ydGVkID0gcmV2ZXJzZShpbXBvcnRlZCk7XG4gIGNvbnN0IHJldmVyc2VkT3JkZXIgPSBmaW5kT3V0T2ZPcmRlcihyZXZlcnNlZEltcG9ydGVkKTtcbiAgaWYgKHJldmVyc2VkT3JkZXIubGVuZ3RoIDwgb3V0T2ZPcmRlci5sZW5ndGgpIHtcbiAgICByZXBvcnRPdXRPZk9yZGVyKGNvbnRleHQsIHJldmVyc2VkSW1wb3J0ZWQsIHJldmVyc2VkT3JkZXIsICdhZnRlcicpO1xuICAgIHJldHVybjtcbiAgfVxuICByZXBvcnRPdXRPZk9yZGVyKGNvbnRleHQsIGltcG9ydGVkLCBvdXRPZk9yZGVyLCAnYmVmb3JlJyk7XG59XG5cbmZ1bmN0aW9uIGdldFNvcnRlcihhc2NlbmRpbmcpIHtcbiAgY29uc3QgbXVsdGlwbGllciA9IGFzY2VuZGluZyA/IDEgOiAtMTtcblxuICByZXR1cm4gZnVuY3Rpb24gaW1wb3J0c1NvcnRlcihpbXBvcnRBLCBpbXBvcnRCKSB7XG4gICAgbGV0IHJlc3VsdCA9IDA7XG5cbiAgICBpZiAoIWluY2x1ZGVzKGltcG9ydEEsICcvJykgJiYgIWluY2x1ZGVzKGltcG9ydEIsICcvJykpIHtcbiAgICAgIGlmIChpbXBvcnRBIDwgaW1wb3J0Qikge1xuICAgICAgICByZXN1bHQgPSAtMTtcbiAgICAgIH0gZWxzZSBpZiAoaW1wb3J0QSA+IGltcG9ydEIpIHtcbiAgICAgICAgcmVzdWx0ID0gMTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdCA9IDA7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IEEgPSBpbXBvcnRBLnNwbGl0KCcvJyk7XG4gICAgICBjb25zdCBCID0gaW1wb3J0Qi5zcGxpdCgnLycpO1xuICAgICAgY29uc3QgYSA9IEEubGVuZ3RoO1xuICAgICAgY29uc3QgYiA9IEIubGVuZ3RoO1xuXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1hdGgubWluKGEsIGIpOyBpKyspIHtcbiAgICAgICAgaWYgKEFbaV0gPCBCW2ldKSB7XG4gICAgICAgICAgcmVzdWx0ID0gLTE7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH0gZWxzZSBpZiAoQVtpXSA+IEJbaV0pIHtcbiAgICAgICAgICByZXN1bHQgPSAxO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICghcmVzdWx0ICYmIGEgIT09IGIpIHtcbiAgICAgICAgcmVzdWx0ID0gYSA8IGIgPyAtMSA6IDE7XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiByZXN1bHQgKiBtdWx0aXBsaWVyO1xuICB9O1xufVxuXG5mdW5jdGlvbiBtdXRhdGVSYW5rc1RvQWxwaGFiZXRpemUoaW1wb3J0ZWQsIGFscGhhYmV0aXplT3B0aW9ucykge1xuICBjb25zdCBncm91cGVkQnlSYW5rcyA9IGltcG9ydGVkLnJlZHVjZShmdW5jdGlvbiAoYWNjLCBpbXBvcnRlZEl0ZW0pIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoYWNjW2ltcG9ydGVkSXRlbS5yYW5rXSkpIHtcbiAgICAgIGFjY1tpbXBvcnRlZEl0ZW0ucmFua10gPSBbXTtcbiAgICB9XG4gICAgYWNjW2ltcG9ydGVkSXRlbS5yYW5rXS5wdXNoKGltcG9ydGVkSXRlbSk7XG4gICAgcmV0dXJuIGFjYztcbiAgfSwge30pO1xuXG4gIGNvbnN0IGdyb3VwUmFua3MgPSBPYmplY3Qua2V5cyhncm91cGVkQnlSYW5rcyk7XG5cbiAgY29uc3Qgc29ydGVyRm4gPSBnZXRTb3J0ZXIoYWxwaGFiZXRpemVPcHRpb25zLm9yZGVyID09PSAnYXNjJyk7XG4gIGNvbnN0IGNvbXBhcmF0b3IgPSBhbHBoYWJldGl6ZU9wdGlvbnMuY2FzZUluc2Vuc2l0aXZlXG4gICAgPyAoYSwgYikgPT4gc29ydGVyRm4oU3RyaW5nKGEudmFsdWUpLnRvTG93ZXJDYXNlKCksIFN0cmluZyhiLnZhbHVlKS50b0xvd2VyQ2FzZSgpKVxuICAgIDogKGEsIGIpID0+IHNvcnRlckZuKGEudmFsdWUsIGIudmFsdWUpO1xuXG4gIC8vIHNvcnQgaW1wb3J0cyBsb2NhbGx5IHdpdGhpbiB0aGVpciBncm91cFxuICBncm91cFJhbmtzLmZvckVhY2goZnVuY3Rpb24gKGdyb3VwUmFuaykge1xuICAgIGdyb3VwZWRCeVJhbmtzW2dyb3VwUmFua10uc29ydChjb21wYXJhdG9yKTtcbiAgfSk7XG5cbiAgLy8gYXNzaWduIGdsb2JhbGx5IHVuaXF1ZSByYW5rIHRvIGVhY2ggaW1wb3J0XG4gIGxldCBuZXdSYW5rID0gMDtcbiAgY29uc3QgYWxwaGFiZXRpemVkUmFua3MgPSBncm91cFJhbmtzLnNvcnQoKS5yZWR1Y2UoZnVuY3Rpb24gKGFjYywgZ3JvdXBSYW5rKSB7XG4gICAgZ3JvdXBlZEJ5UmFua3NbZ3JvdXBSYW5rXS5mb3JFYWNoKGZ1bmN0aW9uIChpbXBvcnRlZEl0ZW0pIHtcbiAgICAgIGFjY1tgJHtpbXBvcnRlZEl0ZW0udmFsdWV9fCR7aW1wb3J0ZWRJdGVtLm5vZGUuaW1wb3J0S2luZH1gXSA9IHBhcnNlSW50KGdyb3VwUmFuaywgMTApICsgbmV3UmFuaztcbiAgICAgIG5ld1JhbmsgKz0gMTtcbiAgICB9KTtcbiAgICByZXR1cm4gYWNjO1xuICB9LCB7fSk7XG5cbiAgLy8gbXV0YXRlIHRoZSBvcmlnaW5hbCBncm91cC1yYW5rIHdpdGggYWxwaGFiZXRpemVkLXJhbmtcbiAgaW1wb3J0ZWQuZm9yRWFjaChmdW5jdGlvbiAoaW1wb3J0ZWRJdGVtKSB7XG4gICAgaW1wb3J0ZWRJdGVtLnJhbmsgPSBhbHBoYWJldGl6ZWRSYW5rc1tgJHtpbXBvcnRlZEl0ZW0udmFsdWV9fCR7aW1wb3J0ZWRJdGVtLm5vZGUuaW1wb3J0S2luZH1gXTtcbiAgfSk7XG59XG5cbi8vIERFVEVDVElOR1xuXG5mdW5jdGlvbiBjb21wdXRlUGF0aFJhbmsocmFua3MsIHBhdGhHcm91cHMsIHBhdGgsIG1heFBvc2l0aW9uKSB7XG4gIGZvciAobGV0IGkgPSAwLCBsID0gcGF0aEdyb3Vwcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBjb25zdCB7IHBhdHRlcm4sIHBhdHRlcm5PcHRpb25zLCBncm91cCwgcG9zaXRpb24gPSAxIH0gPSBwYXRoR3JvdXBzW2ldO1xuICAgIGlmIChtaW5pbWF0Y2gocGF0aCwgcGF0dGVybiwgcGF0dGVybk9wdGlvbnMgfHwgeyBub2NvbW1lbnQ6IHRydWUgfSkpIHtcbiAgICAgIHJldHVybiByYW5rc1tncm91cF0gKyAocG9zaXRpb24gLyBtYXhQb3NpdGlvbik7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGNvbXB1dGVSYW5rKGNvbnRleHQsIHJhbmtzLCBpbXBvcnRFbnRyeSwgZXhjbHVkZWRJbXBvcnRUeXBlcykge1xuICBsZXQgaW1wVHlwZTtcbiAgbGV0IHJhbms7XG4gIGlmIChpbXBvcnRFbnRyeS50eXBlID09PSAnaW1wb3J0Om9iamVjdCcpIHtcbiAgICBpbXBUeXBlID0gJ29iamVjdCc7XG4gIH0gZWxzZSBpZiAoaW1wb3J0RW50cnkubm9kZS5pbXBvcnRLaW5kID09PSAndHlwZScgJiYgcmFua3Mub21pdHRlZFR5cGVzLmluZGV4T2YoJ3R5cGUnKSA9PT0gLTEpIHtcbiAgICBpbXBUeXBlID0gJ3R5cGUnO1xuICB9IGVsc2Uge1xuICAgIGltcFR5cGUgPSBpbXBvcnRUeXBlKGltcG9ydEVudHJ5LnZhbHVlLCBjb250ZXh0KTtcbiAgfVxuICBpZiAoIWV4Y2x1ZGVkSW1wb3J0VHlwZXMuaGFzKGltcFR5cGUpKSB7XG4gICAgcmFuayA9IGNvbXB1dGVQYXRoUmFuayhyYW5rcy5ncm91cHMsIHJhbmtzLnBhdGhHcm91cHMsIGltcG9ydEVudHJ5LnZhbHVlLCByYW5rcy5tYXhQb3NpdGlvbik7XG4gIH1cbiAgaWYgKHR5cGVvZiByYW5rID09PSAndW5kZWZpbmVkJykge1xuICAgIHJhbmsgPSByYW5rcy5ncm91cHNbaW1wVHlwZV07XG4gIH1cbiAgaWYgKGltcG9ydEVudHJ5LnR5cGUgIT09ICdpbXBvcnQnICYmICFpbXBvcnRFbnRyeS50eXBlLnN0YXJ0c1dpdGgoJ2ltcG9ydDonKSkge1xuICAgIHJhbmsgKz0gMTAwO1xuICB9XG5cbiAgcmV0dXJuIHJhbms7XG59XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyTm9kZShjb250ZXh0LCBpbXBvcnRFbnRyeSwgcmFua3MsIGltcG9ydGVkLCBleGNsdWRlZEltcG9ydFR5cGVzKSB7XG4gIGNvbnN0IHJhbmsgPSBjb21wdXRlUmFuayhjb250ZXh0LCByYW5rcywgaW1wb3J0RW50cnksIGV4Y2x1ZGVkSW1wb3J0VHlwZXMpO1xuICBpZiAocmFuayAhPT0gLTEpIHtcbiAgICBpbXBvcnRlZC5wdXNoKE9iamVjdC5hc3NpZ24oe30sIGltcG9ydEVudHJ5LCB7IHJhbmsgfSkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFJlcXVpcmVCbG9jayhub2RlKSB7XG4gIGxldCBuID0gbm9kZTtcbiAgLy8gSGFuZGxlIGNhc2VzIGxpa2UgYGNvbnN0IGJheiA9IHJlcXVpcmUoJ2ZvbycpLmJhci5iYXpgXG4gIC8vIGFuZCBgY29uc3QgZm9vID0gcmVxdWlyZSgnZm9vJykoKWBcbiAgd2hpbGUgKFxuICAgIChuLnBhcmVudC50eXBlID09PSAnTWVtYmVyRXhwcmVzc2lvbicgJiYgbi5wYXJlbnQub2JqZWN0ID09PSBuKSB8fFxuICAgIChuLnBhcmVudC50eXBlID09PSAnQ2FsbEV4cHJlc3Npb24nICYmIG4ucGFyZW50LmNhbGxlZSA9PT0gbilcbiAgKSB7XG4gICAgbiA9IG4ucGFyZW50O1xuICB9XG4gIGlmIChcbiAgICBuLnBhcmVudC50eXBlID09PSAnVmFyaWFibGVEZWNsYXJhdG9yJyAmJlxuICAgIG4ucGFyZW50LnBhcmVudC50eXBlID09PSAnVmFyaWFibGVEZWNsYXJhdGlvbicgJiZcbiAgICBuLnBhcmVudC5wYXJlbnQucGFyZW50LnR5cGUgPT09ICdQcm9ncmFtJ1xuICApIHtcbiAgICByZXR1cm4gbi5wYXJlbnQucGFyZW50LnBhcmVudDtcbiAgfVxufVxuXG5jb25zdCB0eXBlcyA9IFsnYnVpbHRpbicsICdleHRlcm5hbCcsICdpbnRlcm5hbCcsICd1bmtub3duJywgJ3BhcmVudCcsICdzaWJsaW5nJywgJ2luZGV4JywgJ29iamVjdCcsICd0eXBlJ107XG5cbi8vIENyZWF0ZXMgYW4gb2JqZWN0IHdpdGggdHlwZS1yYW5rIHBhaXJzLlxuLy8gRXhhbXBsZTogeyBpbmRleDogMCwgc2libGluZzogMSwgcGFyZW50OiAxLCBleHRlcm5hbDogMSwgYnVpbHRpbjogMiwgaW50ZXJuYWw6IDIgfVxuLy8gV2lsbCB0aHJvdyBhbiBlcnJvciBpZiBpdCBjb250YWlucyBhIHR5cGUgdGhhdCBkb2VzIG5vdCBleGlzdCwgb3IgaGFzIGEgZHVwbGljYXRlXG5mdW5jdGlvbiBjb252ZXJ0R3JvdXBzVG9SYW5rcyhncm91cHMpIHtcbiAgY29uc3QgcmFua09iamVjdCA9IGdyb3Vwcy5yZWR1Y2UoZnVuY3Rpb24gKHJlcywgZ3JvdXAsIGluZGV4KSB7XG4gICAgaWYgKHR5cGVvZiBncm91cCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGdyb3VwID0gW2dyb3VwXTtcbiAgICB9XG4gICAgZ3JvdXAuZm9yRWFjaChmdW5jdGlvbiAoZ3JvdXBJdGVtKSB7XG4gICAgICBpZiAodHlwZXMuaW5kZXhPZihncm91cEl0ZW0pID09PSAtMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0luY29ycmVjdCBjb25maWd1cmF0aW9uIG9mIHRoZSBydWxlOiBVbmtub3duIHR5cGUgYCcgK1xuICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGdyb3VwSXRlbSkgKyAnYCcpO1xuICAgICAgfVxuICAgICAgaWYgKHJlc1tncm91cEl0ZW1dICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbmNvcnJlY3QgY29uZmlndXJhdGlvbiBvZiB0aGUgcnVsZTogYCcgKyBncm91cEl0ZW0gKyAnYCBpcyBkdXBsaWNhdGVkJyk7XG4gICAgICB9XG4gICAgICByZXNbZ3JvdXBJdGVtXSA9IGluZGV4O1xuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG4gIH0sIHt9KTtcblxuICBjb25zdCBvbWl0dGVkVHlwZXMgPSB0eXBlcy5maWx0ZXIoZnVuY3Rpb24gKHR5cGUpIHtcbiAgICByZXR1cm4gcmFua09iamVjdFt0eXBlXSA9PT0gdW5kZWZpbmVkO1xuICB9KTtcblxuICBjb25zdCByYW5rcyA9IG9taXR0ZWRUeXBlcy5yZWR1Y2UoZnVuY3Rpb24gKHJlcywgdHlwZSkge1xuICAgIHJlc1t0eXBlXSA9IGdyb3Vwcy5sZW5ndGg7XG4gICAgcmV0dXJuIHJlcztcbiAgfSwgcmFua09iamVjdCk7XG5cbiAgcmV0dXJuIHsgZ3JvdXBzOiByYW5rcywgb21pdHRlZFR5cGVzIH07XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRQYXRoR3JvdXBzRm9yUmFua3MocGF0aEdyb3Vwcykge1xuICBjb25zdCBhZnRlciA9IHt9O1xuICBjb25zdCBiZWZvcmUgPSB7fTtcblxuICBjb25zdCB0cmFuc2Zvcm1lZCA9IHBhdGhHcm91cHMubWFwKChwYXRoR3JvdXAsIGluZGV4KSA9PiB7XG4gICAgY29uc3QgeyBncm91cCwgcG9zaXRpb246IHBvc2l0aW9uU3RyaW5nIH0gPSBwYXRoR3JvdXA7XG4gICAgbGV0IHBvc2l0aW9uID0gMDtcbiAgICBpZiAocG9zaXRpb25TdHJpbmcgPT09ICdhZnRlcicpIHtcbiAgICAgIGlmICghYWZ0ZXJbZ3JvdXBdKSB7XG4gICAgICAgIGFmdGVyW2dyb3VwXSA9IDE7XG4gICAgICB9XG4gICAgICBwb3NpdGlvbiA9IGFmdGVyW2dyb3VwXSsrO1xuICAgIH0gZWxzZSBpZiAocG9zaXRpb25TdHJpbmcgPT09ICdiZWZvcmUnKSB7XG4gICAgICBpZiAoIWJlZm9yZVtncm91cF0pIHtcbiAgICAgICAgYmVmb3JlW2dyb3VwXSA9IFtdO1xuICAgICAgfVxuICAgICAgYmVmb3JlW2dyb3VwXS5wdXNoKGluZGV4KTtcbiAgICB9XG5cbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgcGF0aEdyb3VwLCB7IHBvc2l0aW9uIH0pO1xuICB9KTtcblxuICBsZXQgbWF4UG9zaXRpb24gPSAxO1xuXG4gIE9iamVjdC5rZXlzKGJlZm9yZSkuZm9yRWFjaCgoZ3JvdXApID0+IHtcbiAgICBjb25zdCBncm91cExlbmd0aCA9IGJlZm9yZVtncm91cF0ubGVuZ3RoO1xuICAgIGJlZm9yZVtncm91cF0uZm9yRWFjaCgoZ3JvdXBJbmRleCwgaW5kZXgpID0+IHtcbiAgICAgIHRyYW5zZm9ybWVkW2dyb3VwSW5kZXhdLnBvc2l0aW9uID0gLTEgKiAoZ3JvdXBMZW5ndGggLSBpbmRleCk7XG4gICAgfSk7XG4gICAgbWF4UG9zaXRpb24gPSBNYXRoLm1heChtYXhQb3NpdGlvbiwgZ3JvdXBMZW5ndGgpO1xuICB9KTtcblxuICBPYmplY3Qua2V5cyhhZnRlcikuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgY29uc3QgZ3JvdXBOZXh0UG9zaXRpb24gPSBhZnRlcltrZXldO1xuICAgIG1heFBvc2l0aW9uID0gTWF0aC5tYXgobWF4UG9zaXRpb24sIGdyb3VwTmV4dFBvc2l0aW9uIC0gMSk7XG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgcGF0aEdyb3VwczogdHJhbnNmb3JtZWQsXG4gICAgbWF4UG9zaXRpb246IG1heFBvc2l0aW9uID4gMTAgPyBNYXRoLnBvdygxMCwgTWF0aC5jZWlsKE1hdGgubG9nMTAobWF4UG9zaXRpb24pKSkgOiAxMCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZml4TmV3TGluZUFmdGVySW1wb3J0KGNvbnRleHQsIHByZXZpb3VzSW1wb3J0KSB7XG4gIGNvbnN0IHByZXZSb290ID0gZmluZFJvb3ROb2RlKHByZXZpb3VzSW1wb3J0Lm5vZGUpO1xuICBjb25zdCB0b2tlbnNUb0VuZE9mTGluZSA9IHRha2VUb2tlbnNBZnRlcldoaWxlKFxuICAgIGNvbnRleHQuZ2V0U291cmNlQ29kZSgpLCBwcmV2Um9vdCwgY29tbWVudE9uU2FtZUxpbmVBcyhwcmV2Um9vdCkpO1xuXG4gIGxldCBlbmRPZkxpbmUgPSBwcmV2Um9vdC5yYW5nZVsxXTtcbiAgaWYgKHRva2Vuc1RvRW5kT2ZMaW5lLmxlbmd0aCA+IDApIHtcbiAgICBlbmRPZkxpbmUgPSB0b2tlbnNUb0VuZE9mTGluZVt0b2tlbnNUb0VuZE9mTGluZS5sZW5ndGggLSAxXS5yYW5nZVsxXTtcbiAgfVxuICByZXR1cm4gKGZpeGVyKSA9PiBmaXhlci5pbnNlcnRUZXh0QWZ0ZXJSYW5nZShbcHJldlJvb3QucmFuZ2VbMF0sIGVuZE9mTGluZV0sICdcXG4nKTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlTmV3TGluZUFmdGVySW1wb3J0KGNvbnRleHQsIGN1cnJlbnRJbXBvcnQsIHByZXZpb3VzSW1wb3J0KSB7XG4gIGNvbnN0IHNvdXJjZUNvZGUgPSBjb250ZXh0LmdldFNvdXJjZUNvZGUoKTtcbiAgY29uc3QgcHJldlJvb3QgPSBmaW5kUm9vdE5vZGUocHJldmlvdXNJbXBvcnQubm9kZSk7XG4gIGNvbnN0IGN1cnJSb290ID0gZmluZFJvb3ROb2RlKGN1cnJlbnRJbXBvcnQubm9kZSk7XG4gIGNvbnN0IHJhbmdlVG9SZW1vdmUgPSBbXG4gICAgZmluZEVuZE9mTGluZVdpdGhDb21tZW50cyhzb3VyY2VDb2RlLCBwcmV2Um9vdCksXG4gICAgZmluZFN0YXJ0T2ZMaW5lV2l0aENvbW1lbnRzKHNvdXJjZUNvZGUsIGN1cnJSb290KSxcbiAgXTtcbiAgaWYgKC9eXFxzKiQvLnRlc3Qoc291cmNlQ29kZS50ZXh0LnN1YnN0cmluZyhyYW5nZVRvUmVtb3ZlWzBdLCByYW5nZVRvUmVtb3ZlWzFdKSkpIHtcbiAgICByZXR1cm4gKGZpeGVyKSA9PiBmaXhlci5yZW1vdmVSYW5nZShyYW5nZVRvUmVtb3ZlKTtcbiAgfVxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBtYWtlTmV3bGluZXNCZXR3ZWVuUmVwb3J0KGNvbnRleHQsIGltcG9ydGVkLCBuZXdsaW5lc0JldHdlZW5JbXBvcnRzKSB7XG4gIGNvbnN0IGdldE51bWJlck9mRW1wdHlMaW5lc0JldHdlZW4gPSAoY3VycmVudEltcG9ydCwgcHJldmlvdXNJbXBvcnQpID0+IHtcbiAgICBjb25zdCBsaW5lc0JldHdlZW5JbXBvcnRzID0gY29udGV4dC5nZXRTb3VyY2VDb2RlKCkubGluZXMuc2xpY2UoXG4gICAgICBwcmV2aW91c0ltcG9ydC5ub2RlLmxvYy5lbmQubGluZSxcbiAgICAgIGN1cnJlbnRJbXBvcnQubm9kZS5sb2Muc3RhcnQubGluZSAtIDEsXG4gICAgKTtcblxuICAgIHJldHVybiBsaW5lc0JldHdlZW5JbXBvcnRzLmZpbHRlcigobGluZSkgPT4gIWxpbmUudHJpbSgpLmxlbmd0aCkubGVuZ3RoO1xuICB9O1xuICBsZXQgcHJldmlvdXNJbXBvcnQgPSBpbXBvcnRlZFswXTtcblxuICBpbXBvcnRlZC5zbGljZSgxKS5mb3JFYWNoKGZ1bmN0aW9uIChjdXJyZW50SW1wb3J0KSB7XG4gICAgY29uc3QgZW1wdHlMaW5lc0JldHdlZW4gPSBnZXROdW1iZXJPZkVtcHR5TGluZXNCZXR3ZWVuKGN1cnJlbnRJbXBvcnQsIHByZXZpb3VzSW1wb3J0KTtcblxuICAgIGlmIChuZXdsaW5lc0JldHdlZW5JbXBvcnRzID09PSAnYWx3YXlzJ1xuICAgICAgICB8fCBuZXdsaW5lc0JldHdlZW5JbXBvcnRzID09PSAnYWx3YXlzLWFuZC1pbnNpZGUtZ3JvdXBzJykge1xuICAgICAgaWYgKGN1cnJlbnRJbXBvcnQucmFuayAhPT0gcHJldmlvdXNJbXBvcnQucmFuayAmJiBlbXB0eUxpbmVzQmV0d2VlbiA9PT0gMCkge1xuICAgICAgICBjb250ZXh0LnJlcG9ydCh7XG4gICAgICAgICAgbm9kZTogcHJldmlvdXNJbXBvcnQubm9kZSxcbiAgICAgICAgICBtZXNzYWdlOiAnVGhlcmUgc2hvdWxkIGJlIGF0IGxlYXN0IG9uZSBlbXB0eSBsaW5lIGJldHdlZW4gaW1wb3J0IGdyb3VwcycsXG4gICAgICAgICAgZml4OiBmaXhOZXdMaW5lQWZ0ZXJJbXBvcnQoY29udGV4dCwgcHJldmlvdXNJbXBvcnQpLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoY3VycmVudEltcG9ydC5yYW5rID09PSBwcmV2aW91c0ltcG9ydC5yYW5rXG4gICAgICAgICYmIGVtcHR5TGluZXNCZXR3ZWVuID4gMFxuICAgICAgICAmJiBuZXdsaW5lc0JldHdlZW5JbXBvcnRzICE9PSAnYWx3YXlzLWFuZC1pbnNpZGUtZ3JvdXBzJykge1xuICAgICAgICBjb250ZXh0LnJlcG9ydCh7XG4gICAgICAgICAgbm9kZTogcHJldmlvdXNJbXBvcnQubm9kZSxcbiAgICAgICAgICBtZXNzYWdlOiAnVGhlcmUgc2hvdWxkIGJlIG5vIGVtcHR5IGxpbmUgd2l0aGluIGltcG9ydCBncm91cCcsXG4gICAgICAgICAgZml4OiByZW1vdmVOZXdMaW5lQWZ0ZXJJbXBvcnQoY29udGV4dCwgY3VycmVudEltcG9ydCwgcHJldmlvdXNJbXBvcnQpLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGVtcHR5TGluZXNCZXR3ZWVuID4gMCkge1xuICAgICAgY29udGV4dC5yZXBvcnQoe1xuICAgICAgICBub2RlOiBwcmV2aW91c0ltcG9ydC5ub2RlLFxuICAgICAgICBtZXNzYWdlOiAnVGhlcmUgc2hvdWxkIGJlIG5vIGVtcHR5IGxpbmUgYmV0d2VlbiBpbXBvcnQgZ3JvdXBzJyxcbiAgICAgICAgZml4OiByZW1vdmVOZXdMaW5lQWZ0ZXJJbXBvcnQoY29udGV4dCwgY3VycmVudEltcG9ydCwgcHJldmlvdXNJbXBvcnQpLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJldmlvdXNJbXBvcnQgPSBjdXJyZW50SW1wb3J0O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0QWxwaGFiZXRpemVDb25maWcob3B0aW9ucykge1xuICBjb25zdCBhbHBoYWJldGl6ZSA9IG9wdGlvbnMuYWxwaGFiZXRpemUgfHwge307XG4gIGNvbnN0IG9yZGVyID0gYWxwaGFiZXRpemUub3JkZXIgfHwgJ2lnbm9yZSc7XG4gIGNvbnN0IGNhc2VJbnNlbnNpdGl2ZSA9IGFscGhhYmV0aXplLmNhc2VJbnNlbnNpdGl2ZSB8fCBmYWxzZTtcblxuICByZXR1cm4geyBvcmRlciwgY2FzZUluc2Vuc2l0aXZlIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBtZXRhOiB7XG4gICAgdHlwZTogJ3N1Z2dlc3Rpb24nLFxuICAgIGRvY3M6IHtcbiAgICAgIHVybDogZG9jc1VybCgnb3JkZXInKSxcbiAgICB9LFxuXG4gICAgZml4YWJsZTogJ2NvZGUnLFxuICAgIHNjaGVtYTogW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgIGdyb3Vwczoge1xuICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHBhdGhHcm91cHNFeGNsdWRlZEltcG9ydFR5cGVzOiB7XG4gICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgcGF0aEdyb3Vwczoge1xuICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICAgIGl0ZW1zOiB7XG4gICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgcGF0dGVybjoge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBwYXR0ZXJuT3B0aW9uczoge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBncm91cDoge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICBlbnVtOiB0eXBlcyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgIGVudW06IFsnYWZ0ZXInLCAnYmVmb3JlJ10sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsncGF0dGVybicsICdncm91cCddLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgICduZXdsaW5lcy1iZXR3ZWVuJzoge1xuICAgICAgICAgICAgZW51bTogW1xuICAgICAgICAgICAgICAnaWdub3JlJyxcbiAgICAgICAgICAgICAgJ2Fsd2F5cycsXG4gICAgICAgICAgICAgICdhbHdheXMtYW5kLWluc2lkZS1ncm91cHMnLFxuICAgICAgICAgICAgICAnbmV2ZXInLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGFscGhhYmV0aXplOiB7XG4gICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgY2FzZUluc2Vuc2l0aXZlOiB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBvcmRlcjoge1xuICAgICAgICAgICAgICAgIGVudW06IFsnaWdub3JlJywgJ2FzYycsICdkZXNjJ10sXG4gICAgICAgICAgICAgICAgZGVmYXVsdDogJ2lnbm9yZScsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbFByb3BlcnRpZXM6IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgd2Fybk9uVW5hc3NpZ25lZEltcG9ydHM6IHtcbiAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGFkZGl0aW9uYWxQcm9wZXJ0aWVzOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSxcblxuICBjcmVhdGU6IGZ1bmN0aW9uIGltcG9ydE9yZGVyUnVsZShjb250ZXh0KSB7XG4gICAgY29uc3Qgb3B0aW9ucyA9IGNvbnRleHQub3B0aW9uc1swXSB8fCB7fTtcbiAgICBjb25zdCBuZXdsaW5lc0JldHdlZW5JbXBvcnRzID0gb3B0aW9uc1snbmV3bGluZXMtYmV0d2VlbiddIHx8ICdpZ25vcmUnO1xuICAgIGNvbnN0IHBhdGhHcm91cHNFeGNsdWRlZEltcG9ydFR5cGVzID0gbmV3IFNldChvcHRpb25zWydwYXRoR3JvdXBzRXhjbHVkZWRJbXBvcnRUeXBlcyddIHx8IFsnYnVpbHRpbicsICdleHRlcm5hbCcsICdvYmplY3QnXSk7XG4gICAgY29uc3QgYWxwaGFiZXRpemUgPSBnZXRBbHBoYWJldGl6ZUNvbmZpZyhvcHRpb25zKTtcbiAgICBsZXQgcmFua3M7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBwYXRoR3JvdXBzLCBtYXhQb3NpdGlvbiB9ID0gY29udmVydFBhdGhHcm91cHNGb3JSYW5rcyhvcHRpb25zLnBhdGhHcm91cHMgfHwgW10pO1xuICAgICAgY29uc3QgeyBncm91cHMsIG9taXR0ZWRUeXBlcyB9ID0gY29udmVydEdyb3Vwc1RvUmFua3Mob3B0aW9ucy5ncm91cHMgfHwgZGVmYXVsdEdyb3Vwcyk7XG4gICAgICByYW5rcyA9IHtcbiAgICAgICAgZ3JvdXBzLFxuICAgICAgICBvbWl0dGVkVHlwZXMsXG4gICAgICAgIHBhdGhHcm91cHMsXG4gICAgICAgIG1heFBvc2l0aW9uLFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgLy8gTWFsZm9ybWVkIGNvbmZpZ3VyYXRpb25cbiAgICAgIHJldHVybiB7XG4gICAgICAgIFByb2dyYW0obm9kZSkge1xuICAgICAgICAgIGNvbnRleHQucmVwb3J0KG5vZGUsIGVycm9yLm1lc3NhZ2UpO1xuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9XG4gICAgY29uc3QgaW1wb3J0TWFwID0gbmV3IE1hcCgpO1xuXG4gICAgZnVuY3Rpb24gZ2V0QmxvY2tJbXBvcnRzKG5vZGUpIHtcbiAgICAgIGlmICghaW1wb3J0TWFwLmhhcyhub2RlKSkge1xuICAgICAgICBpbXBvcnRNYXAuc2V0KG5vZGUsIFtdKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpbXBvcnRNYXAuZ2V0KG5vZGUpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBJbXBvcnREZWNsYXJhdGlvbjogZnVuY3Rpb24gaGFuZGxlSW1wb3J0cyhub2RlKSB7XG4gICAgICAgIC8vIElnbm9yaW5nIHVuYXNzaWduZWQgaW1wb3J0cyB1bmxlc3Mgd2Fybk9uVW5hc3NpZ25lZEltcG9ydHMgaXMgc2V0XG4gICAgICAgIGlmIChub2RlLnNwZWNpZmllcnMubGVuZ3RoIHx8IG9wdGlvbnMud2Fybk9uVW5hc3NpZ25lZEltcG9ydHMpIHtcbiAgICAgICAgICBjb25zdCBuYW1lID0gbm9kZS5zb3VyY2UudmFsdWU7XG4gICAgICAgICAgcmVnaXN0ZXJOb2RlKFxuICAgICAgICAgICAgY29udGV4dCxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgbm9kZSxcbiAgICAgICAgICAgICAgdmFsdWU6IG5hbWUsXG4gICAgICAgICAgICAgIGRpc3BsYXlOYW1lOiBuYW1lLFxuICAgICAgICAgICAgICB0eXBlOiAnaW1wb3J0JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByYW5rcyxcbiAgICAgICAgICAgIGdldEJsb2NrSW1wb3J0cyhub2RlLnBhcmVudCksXG4gICAgICAgICAgICBwYXRoR3JvdXBzRXhjbHVkZWRJbXBvcnRUeXBlcyxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgVFNJbXBvcnRFcXVhbHNEZWNsYXJhdGlvbjogZnVuY3Rpb24gaGFuZGxlSW1wb3J0cyhub2RlKSB7XG4gICAgICAgIGxldCBkaXNwbGF5TmFtZTtcbiAgICAgICAgbGV0IHZhbHVlO1xuICAgICAgICBsZXQgdHlwZTtcbiAgICAgICAgLy8gc2tpcCBcImV4cG9ydCBpbXBvcnRcInNcbiAgICAgICAgaWYgKG5vZGUuaXNFeHBvcnQpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5vZGUubW9kdWxlUmVmZXJlbmNlLnR5cGUgPT09ICdUU0V4dGVybmFsTW9kdWxlUmVmZXJlbmNlJykge1xuICAgICAgICAgIHZhbHVlID0gbm9kZS5tb2R1bGVSZWZlcmVuY2UuZXhwcmVzc2lvbi52YWx1ZTtcbiAgICAgICAgICBkaXNwbGF5TmFtZSA9IHZhbHVlO1xuICAgICAgICAgIHR5cGUgPSAnaW1wb3J0JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWx1ZSA9ICcnO1xuICAgICAgICAgIGRpc3BsYXlOYW1lID0gY29udGV4dC5nZXRTb3VyY2VDb2RlKCkuZ2V0VGV4dChub2RlLm1vZHVsZVJlZmVyZW5jZSk7XG4gICAgICAgICAgdHlwZSA9ICdpbXBvcnQ6b2JqZWN0JztcbiAgICAgICAgfVxuICAgICAgICByZWdpc3Rlck5vZGUoXG4gICAgICAgICAgY29udGV4dCxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBub2RlLFxuICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZSxcbiAgICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgfSxcbiAgICAgICAgICByYW5rcyxcbiAgICAgICAgICBnZXRCbG9ja0ltcG9ydHMobm9kZS5wYXJlbnQpLFxuICAgICAgICAgIHBhdGhHcm91cHNFeGNsdWRlZEltcG9ydFR5cGVzLFxuICAgICAgICApO1xuICAgICAgfSxcbiAgICAgIENhbGxFeHByZXNzaW9uOiBmdW5jdGlvbiBoYW5kbGVSZXF1aXJlcyhub2RlKSB7XG4gICAgICAgIGlmICghaXNTdGF0aWNSZXF1aXJlKG5vZGUpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGJsb2NrID0gZ2V0UmVxdWlyZUJsb2NrKG5vZGUpO1xuICAgICAgICBpZiAoIWJsb2NrKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5hbWUgPSBub2RlLmFyZ3VtZW50c1swXS52YWx1ZTtcbiAgICAgICAgcmVnaXN0ZXJOb2RlKFxuICAgICAgICAgIGNvbnRleHQsXG4gICAgICAgICAge1xuICAgICAgICAgICAgbm9kZSxcbiAgICAgICAgICAgIHZhbHVlOiBuYW1lLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6IG5hbWUsXG4gICAgICAgICAgICB0eXBlOiAncmVxdWlyZScsXG4gICAgICAgICAgfSxcbiAgICAgICAgICByYW5rcyxcbiAgICAgICAgICBnZXRCbG9ja0ltcG9ydHMoYmxvY2spLFxuICAgICAgICAgIHBhdGhHcm91cHNFeGNsdWRlZEltcG9ydFR5cGVzLFxuICAgICAgICApO1xuICAgICAgfSxcbiAgICAgICdQcm9ncmFtOmV4aXQnOiBmdW5jdGlvbiByZXBvcnRBbmRSZXNldCgpIHtcbiAgICAgICAgaW1wb3J0TWFwLmZvckVhY2goKGltcG9ydGVkKSA9PiB7XG4gICAgICAgICAgaWYgKG5ld2xpbmVzQmV0d2VlbkltcG9ydHMgIT09ICdpZ25vcmUnKSB7XG4gICAgICAgICAgICBtYWtlTmV3bGluZXNCZXR3ZWVuUmVwb3J0KGNvbnRleHQsIGltcG9ydGVkLCBuZXdsaW5lc0JldHdlZW5JbXBvcnRzKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoYWxwaGFiZXRpemUub3JkZXIgIT09ICdpZ25vcmUnKSB7XG4gICAgICAgICAgICBtdXRhdGVSYW5rc1RvQWxwaGFiZXRpemUoaW1wb3J0ZWQsIGFscGhhYmV0aXplKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBtYWtlT3V0T2ZPcmRlclJlcG9ydChjb250ZXh0LCBpbXBvcnRlZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGltcG9ydE1hcC5jbGVhcigpO1xuICAgICAgfSxcbiAgICB9O1xuICB9LFxufTtcbiJdfQ==