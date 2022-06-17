'use strict';




var _staticRequire = require('../core/staticRequire');var _staticRequire2 = _interopRequireDefault(_staticRequire);
var _docsUrl = require('../docsUrl');var _docsUrl2 = _interopRequireDefault(_docsUrl);

var _debug = require('debug');var _debug2 = _interopRequireDefault(_debug);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { 'default': obj };}
var log = (0, _debug2['default'])('eslint-plugin-import:rules:newline-after-import');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------
/**
 * @fileoverview Rule to enforce new line after import not followed by another import.
 * @author Radek Benkel
 */function containsNodeOrEqual(outerNode, innerNode) {return outerNode.range[0] <= innerNode.range[0] && outerNode.range[1] >= innerNode.range[1];}

function getScopeBody(scope) {
  if (scope.block.type === 'SwitchStatement') {
    log('SwitchStatement scopes not supported');
    return null;
  }var

  body = scope.block.body;
  if (body && body.type === 'BlockStatement') {
    return body.body;
  }

  return body;
}

function findNodeIndexInScopeBody(body, nodeToFind) {
  return body.findIndex(function (node) {return containsNodeOrEqual(node, nodeToFind);});
}

function getLineDifference(node, nextNode) {
  return nextNode.loc.start.line - node.loc.end.line;
}

function isClassWithDecorator(node) {
  return node.type === 'ClassDeclaration' && node.decorators && node.decorators.length;
}

function isExportDefaultClass(node) {
  return node.type === 'ExportDefaultDeclaration' && node.declaration.type === 'ClassDeclaration';
}

function isExportNameClass(node) {

  return node.type === 'ExportNamedDeclaration' && node.declaration && node.declaration.type === 'ClassDeclaration';
}

module.exports = {
  meta: {
    type: 'layout',
    docs: {
      url: (0, _docsUrl2['default'])('newline-after-import') },

    fixable: 'whitespace',
    schema: [
    {
      'type': 'object',
      'properties': {
        'count': {
          'type': 'integer',
          'minimum': 1 },

        'considerComments': { 'type': 'boolean' } },

      'additionalProperties': false }] },



  create: function () {function create(context) {
      var level = 0;
      var requireCalls = [];
      var options = Object.assign({ count: 1, considerComments: false }, context.options[0]);

      function checkForNewLine(node, nextNode, type) {
        if (isExportDefaultClass(nextNode) || isExportNameClass(nextNode)) {
          var classNode = nextNode.declaration;

          if (isClassWithDecorator(classNode)) {
            nextNode = classNode.decorators[0];
          }
        } else if (isClassWithDecorator(nextNode)) {
          nextNode = nextNode.decorators[0];
        }

        var lineDifference = getLineDifference(node, nextNode);
        var EXPECTED_LINE_DIFFERENCE = options.count + 1;

        if (lineDifference < EXPECTED_LINE_DIFFERENCE) {
          var column = node.loc.start.column;

          if (node.loc.start.line !== node.loc.end.line) {
            column = 0;
          }

          context.report({
            loc: {
              line: node.loc.end.line,
              column: column },

            message: 'Expected ' + String(options.count) + ' empty line' + (options.count > 1 ? 's' : '') + ' after ' + String(type) + ' statement not followed by another ' + String(type) + '.',
            fix: function () {function fix(fixer) {return fixer.insertTextAfter(
                node,
                '\n'.repeat(EXPECTED_LINE_DIFFERENCE - lineDifference));}return fix;}() });


        }
      }

      function commentAfterImport(node, nextComment) {
        var lineDifference = getLineDifference(node, nextComment);
        var EXPECTED_LINE_DIFFERENCE = options.count + 1;

        if (lineDifference < EXPECTED_LINE_DIFFERENCE) {
          var column = node.loc.start.column;

          if (node.loc.start.line !== node.loc.end.line) {
            column = 0;
          }

          context.report({
            loc: {
              line: node.loc.end.line,
              column: column },

            message: 'Expected ' + String(options.count) + ' empty line' + (options.count > 1 ? 's' : '') + ' after import statement not followed by another import.',
            fix: function () {function fix(fixer) {return fixer.insertTextAfter(
                node,
                '\n'.repeat(EXPECTED_LINE_DIFFERENCE - lineDifference));}return fix;}() });


        }
      }

      function incrementLevel() {
        level++;
      }
      function decrementLevel() {
        level--;
      }

      function checkImport(node) {var
        parent = node.parent;
        var nodePosition = parent.body.indexOf(node);
        var nextNode = parent.body[nodePosition + 1];
        var endLine = node.loc.end.line;
        var nextComment = void 0;

        if (typeof parent.comments !== 'undefined' && options.considerComments) {
          nextComment = parent.comments.find(function (o) {return o.loc.start.line === endLine + 1;});
        }


        // skip "export import"s
        if (node.type === 'TSImportEqualsDeclaration' && node.isExport) {
          return;
        }

        if (nextComment && typeof nextComment !== 'undefined') {
          commentAfterImport(node, nextComment);
        } else if (nextNode && nextNode.type !== 'ImportDeclaration' && (nextNode.type !== 'TSImportEqualsDeclaration' || nextNode.isExport)) {
          checkForNewLine(node, nextNode, 'import');
        }
      }

      return {
        ImportDeclaration: checkImport,
        TSImportEqualsDeclaration: checkImport,
        CallExpression: function () {function CallExpression(node) {
            if ((0, _staticRequire2['default'])(node) && level === 0) {
              requireCalls.push(node);
            }
          }return CallExpression;}(),
        'Program:exit': function () {function ProgramExit() {
            log('exit processing for', context.getPhysicalFilename ? context.getPhysicalFilename() : context.getFilename());
            var scopeBody = getScopeBody(context.getScope());
            log('got scope:', scopeBody);

            requireCalls.forEach(function (node, index) {
              var nodePosition = findNodeIndexInScopeBody(scopeBody, node);
              log('node position in scope:', nodePosition);

              var statementWithRequireCall = scopeBody[nodePosition];
              var nextStatement = scopeBody[nodePosition + 1];
              var nextRequireCall = requireCalls[index + 1];

              if (nextRequireCall && containsNodeOrEqual(statementWithRequireCall, nextRequireCall)) {
                return;
              }

              if (nextStatement && (
              !nextRequireCall || !containsNodeOrEqual(nextStatement, nextRequireCall))) {

                checkForNewLine(statementWithRequireCall, nextStatement, 'require');
              }
            });
          }return ProgramExit;}(),
        FunctionDeclaration: incrementLevel,
        FunctionExpression: incrementLevel,
        ArrowFunctionExpression: incrementLevel,
        BlockStatement: incrementLevel,
        ObjectExpression: incrementLevel,
        Decorator: incrementLevel,
        'FunctionDeclaration:exit': decrementLevel,
        'FunctionExpression:exit': decrementLevel,
        'ArrowFunctionExpression:exit': decrementLevel,
        'BlockStatement:exit': decrementLevel,
        'ObjectExpression:exit': decrementLevel,
        'Decorator:exit': decrementLevel };

    }return create;}() };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ydWxlcy9uZXdsaW5lLWFmdGVyLWltcG9ydC5qcyJdLCJuYW1lcyI6WyJsb2ciLCJjb250YWluc05vZGVPckVxdWFsIiwib3V0ZXJOb2RlIiwiaW5uZXJOb2RlIiwicmFuZ2UiLCJnZXRTY29wZUJvZHkiLCJzY29wZSIsImJsb2NrIiwidHlwZSIsImJvZHkiLCJmaW5kTm9kZUluZGV4SW5TY29wZUJvZHkiLCJub2RlVG9GaW5kIiwiZmluZEluZGV4Iiwibm9kZSIsImdldExpbmVEaWZmZXJlbmNlIiwibmV4dE5vZGUiLCJsb2MiLCJzdGFydCIsImxpbmUiLCJlbmQiLCJpc0NsYXNzV2l0aERlY29yYXRvciIsImRlY29yYXRvcnMiLCJsZW5ndGgiLCJpc0V4cG9ydERlZmF1bHRDbGFzcyIsImRlY2xhcmF0aW9uIiwiaXNFeHBvcnROYW1lQ2xhc3MiLCJtb2R1bGUiLCJleHBvcnRzIiwibWV0YSIsImRvY3MiLCJ1cmwiLCJmaXhhYmxlIiwic2NoZW1hIiwiY3JlYXRlIiwiY29udGV4dCIsImxldmVsIiwicmVxdWlyZUNhbGxzIiwib3B0aW9ucyIsIk9iamVjdCIsImFzc2lnbiIsImNvdW50IiwiY29uc2lkZXJDb21tZW50cyIsImNoZWNrRm9yTmV3TGluZSIsImNsYXNzTm9kZSIsImxpbmVEaWZmZXJlbmNlIiwiRVhQRUNURURfTElORV9ESUZGRVJFTkNFIiwiY29sdW1uIiwicmVwb3J0IiwibWVzc2FnZSIsImZpeCIsImZpeGVyIiwiaW5zZXJ0VGV4dEFmdGVyIiwicmVwZWF0IiwiY29tbWVudEFmdGVySW1wb3J0IiwibmV4dENvbW1lbnQiLCJpbmNyZW1lbnRMZXZlbCIsImRlY3JlbWVudExldmVsIiwiY2hlY2tJbXBvcnQiLCJwYXJlbnQiLCJub2RlUG9zaXRpb24iLCJpbmRleE9mIiwiZW5kTGluZSIsImNvbW1lbnRzIiwiZmluZCIsIm8iLCJpc0V4cG9ydCIsIkltcG9ydERlY2xhcmF0aW9uIiwiVFNJbXBvcnRFcXVhbHNEZWNsYXJhdGlvbiIsIkNhbGxFeHByZXNzaW9uIiwicHVzaCIsImdldFBoeXNpY2FsRmlsZW5hbWUiLCJnZXRGaWxlbmFtZSIsInNjb3BlQm9keSIsImdldFNjb3BlIiwiZm9yRWFjaCIsImluZGV4Iiwic3RhdGVtZW50V2l0aFJlcXVpcmVDYWxsIiwibmV4dFN0YXRlbWVudCIsIm5leHRSZXF1aXJlQ2FsbCIsIkZ1bmN0aW9uRGVjbGFyYXRpb24iLCJGdW5jdGlvbkV4cHJlc3Npb24iLCJBcnJvd0Z1bmN0aW9uRXhwcmVzc2lvbiIsIkJsb2NrU3RhdGVtZW50IiwiT2JqZWN0RXhwcmVzc2lvbiIsIkRlY29yYXRvciJdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFLQSxzRDtBQUNBLHFDOztBQUVBLDhCO0FBQ0EsSUFBTUEsTUFBTSx3QkFBTSxpREFBTixDQUFaOztBQUVBO0FBQ0E7QUFDQTtBQWJBOzs7R0FlQSxTQUFTQyxtQkFBVCxDQUE2QkMsU0FBN0IsRUFBd0NDLFNBQXhDLEVBQW1ELENBQ2pELE9BQU9ELFVBQVVFLEtBQVYsQ0FBZ0IsQ0FBaEIsS0FBc0JELFVBQVVDLEtBQVYsQ0FBZ0IsQ0FBaEIsQ0FBdEIsSUFBNENGLFVBQVVFLEtBQVYsQ0FBZ0IsQ0FBaEIsS0FBc0JELFVBQVVDLEtBQVYsQ0FBZ0IsQ0FBaEIsQ0FBekUsQ0FDRDs7QUFFRCxTQUFTQyxZQUFULENBQXNCQyxLQUF0QixFQUE2QjtBQUMzQixNQUFJQSxNQUFNQyxLQUFOLENBQVlDLElBQVosS0FBcUIsaUJBQXpCLEVBQTRDO0FBQzFDUixRQUFJLHNDQUFKO0FBQ0EsV0FBTyxJQUFQO0FBQ0QsR0FKMEI7O0FBTW5CUyxNQU5tQixHQU1WSCxNQUFNQyxLQU5JLENBTW5CRSxJQU5tQjtBQU8zQixNQUFJQSxRQUFRQSxLQUFLRCxJQUFMLEtBQWMsZ0JBQTFCLEVBQTRDO0FBQzFDLFdBQU9DLEtBQUtBLElBQVo7QUFDRDs7QUFFRCxTQUFPQSxJQUFQO0FBQ0Q7O0FBRUQsU0FBU0Msd0JBQVQsQ0FBa0NELElBQWxDLEVBQXdDRSxVQUF4QyxFQUFvRDtB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aEI7QUFpQ0x5Qiw0QkFBb0J6QixjQWpDZjtBQWtDTDBCLGlDQUF5QjFCLGNBbENwQjtBQW1DTDJCLHdCQUFnQjNCLGNBbkNYO0FBb0NMNEIsMEJBQWtCNUIsY0FwQ2I7QUFxQ0w2QixtQkFBVzdCLGNBckNOO0FBc0NMLG9DQUE0QkMsY0F0Q3ZCO0FBdUNMLG1DQUEyQkEsY0F2Q3RCO0FBd0NMLHdDQUFnQ0EsY0F4QzNCO0FBeUNMLCtCQUF1QkEsY0F6Q2xCO0FBMENMLGlDQUF5QkEsY0ExQ3BCO0FBMkNMLDBCQUFrQkEsY0EzQ2IsRUFBUDs7QUE2Q0QsS0FsS2MsbUJBQWpCIiwiZmlsZSI6Im5ld2xpbmUtYWZ0ZXItaW1wb3J0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IFJ1bGUgdG8gZW5mb3JjZSBuZXcgbGluZSBhZnRlciBpbXBvcnQgbm90IGZvbGxvd2VkIGJ5IGFub3RoZXIgaW1wb3J0LlxuICogQGF1dGhvciBSYWRlayBCZW5rZWxcbiAqL1xuXG5pbXBvcnQgaXNTdGF0aWNSZXF1aXJlIGZyb20gJy4uL2NvcmUvc3RhdGljUmVxdWlyZSc7XG5pbXBvcnQgZG9jc1VybCBmcm9tICcuLi9kb2NzVXJsJztcblxuaW1wb3J0IGRlYnVnIGZyb20gJ2RlYnVnJztcbmNvbnN0IGxvZyA9IGRlYnVnKCdlc2xpbnQtcGx1Z2luLWltcG9ydDpydWxlczpuZXdsaW5lLWFmdGVyLWltcG9ydCcpO1xuXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUnVsZSBEZWZpbml0aW9uXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiBjb250YWluc05vZGVPckVxdWFsKG91dGVyTm9kZSwgaW5uZXJOb2RlKSB7XG4gIHJldHVybiBvdXRlck5vZGUucmFuZ2VbMF0gPD0gaW5uZXJOb2RlLnJhbmdlWzBdICYmIG91dGVyTm9kZS5yYW5nZVsxXSA+PSBpbm5lck5vZGUucmFuZ2VbMV07XG59XG5cbmZ1bmN0aW9uIGdldFNjb3BlQm9keShzY29wZSkge1xuICBpZiAoc2NvcGUuYmxvY2sudHlwZSA9PT0gJ1N3aXRjaFN0YXRlbWVudCcpIHtcbiAgICBsb2coJ1N3aXRjaFN0YXRlbWVudCBzY29wZXMgbm90IHN1cHBvcnRlZCcpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgeyBib2R5IH0gPSBzY29wZS5ibG9jaztcbiAgaWYgKGJvZHkgJiYgYm9keS50eXBlID09PSAnQmxvY2tTdGF0ZW1lbnQnKSB7XG4gICAgcmV0dXJuIGJvZHkuYm9keTtcbiAgfVxuXG4gIHJldHVybiBib2R5O1xufVxuXG5mdW5jdGlvbiBmaW5kTm9kZUluZGV4SW5TY29wZUJvZHkoYm9keSwgbm9kZVRvRmluZCkge1xuICByZXR1cm4gYm9keS5maW5kSW5kZXgoKG5vZGUpID0+IGNvbnRhaW5zTm9kZU9yRXF1YWwobm9kZSwgbm9kZVRvRmluZCkpO1xufVxuXG5mdW5jdGlvbiBnZXRMaW5lRGlmZmVyZW5jZShub2RlLCBuZXh0Tm9kZSkge1xuICByZXR1cm4gbmV4dE5vZGUubG9jLnN0YXJ0LmxpbmUgLSBub2RlLmxvYy5lbmQubGluZTtcbn1cblxuZnVuY3Rpb24gaXNDbGFzc1dpdGhEZWNvcmF0b3Iobm9kZSkge1xuICByZXR1cm4gbm9kZS50eXBlID09PSAnQ2xhc3NEZWNsYXJhdGlvbicgJiYgbm9kZS5kZWNvcmF0b3JzICYmIG5vZGUuZGVjb3JhdG9ycy5sZW5ndGg7XG59XG5cbmZ1bmN0aW9uIGlzRXhwb3J0RGVmYXVsdENsYXNzKG5vZGUpIHtcbiAgcmV0dXJuIG5vZGUudHlwZSA9PT0gJ0V4cG9ydERlZmF1bHREZWNsYXJhdGlvbicgJiYgbm9kZS5kZWNsYXJhdGlvbi50eXBlID09PSAnQ2xhc3NEZWNsYXJhdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzRXhwb3J0TmFtZUNsYXNzKG5vZGUpIHtcblxuICByZXR1cm4gbm9kZS50eXBlID09PSAnRXhwb3J0TmFtZWREZWNsYXJhdGlvbicgJiYgbm9kZS5kZWNsYXJhdGlvbiAmJiBub2RlLmRlY2xhcmF0aW9uLnR5cGUgPT09ICdDbGFzc0RlY2xhcmF0aW9uJztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIG1ldGE6IHtcbiAgICB0eXBlOiAnbGF5b3V0JyxcbiAgICBkb2NzOiB7XG4gICAgICB1cmw6IGRvY3NVcmwoJ25ld2xpbmUtYWZ0ZXItaW1wb3J0JyksXG4gICAgfSxcbiAgICBmaXhhYmxlOiAnd2hpdGVzcGFjZScsXG4gICAgc2NoZW1hOiBbXG4gICAgICB7XG4gICAgICAgICd0eXBlJzogJ29iamVjdCcsXG4gICAgICAgICdwcm9wZXJ0aWVzJzoge1xuICAgICAgICAgICdjb3VudCc6IHtcbiAgICAgICAgICAgICd0eXBlJzogJ2ludGVnZXInLFxuICAgICAgICAgICAgJ21pbmltdW0nOiAxLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgJ2NvbnNpZGVyQ29tbWVudHMnOiB7ICd0eXBlJzogJ2Jvb2xlYW4nIH0sXG4gICAgICAgIH0sXG4gICAgICAgICdhZGRpdGlvbmFsUHJvcGVydGllcyc6IGZhbHNlLFxuICAgICAgfSxcbiAgICBdLFxuICB9LFxuICBjcmVhdGUoY29udGV4dCkge1xuICAgIGxldCBsZXZlbCA9IDA7XG4gICAgY29uc3QgcmVxdWlyZUNhbGxzID0gW107XG4gICAgY29uc3Qgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oeyBjb3VudDogMSwgY29uc2lkZXJDb21tZW50czogZmFsc2UgfSwgY29udGV4dC5vcHRpb25zWzBdKTtcblxuICAgIGZ1bmN0aW9uIGNoZWNrRm9yTmV3TGluZShub2RlLCBuZXh0Tm9kZSwgdHlwZSkge1xuICAgICAgaWYgKGlzRXhwb3J0RGVmYXVsdENsYXNzKG5leHROb2RlKSB8fCBpc0V4cG9ydE5hbWVDbGFzcyhuZXh0Tm9kZSkpIHtcbiAgICAgICAgY29uc3QgY2xhc3NOb2RlID0gbmV4dE5vZGUuZGVjbGFyYXRpb247XG5cbiAgICAgICAgaWYgKGlzQ2xhc3NXaXRoRGVjb3JhdG9yKGNsYXNzTm9kZSkpIHtcbiAgICAgICAgICBuZXh0Tm9kZSA9IGNsYXNzTm9kZS5kZWNvcmF0b3JzWzBdO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGlzQ2xhc3NXaXRoRGVjb3JhdG9yKG5leHROb2RlKSkge1xuICAgICAgICBuZXh0Tm9kZSA9IG5leHROb2RlLmRlY29yYXRvcnNbMF07XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGxpbmVEaWZmZXJlbmNlID0gZ2V0TGluZURpZmZlcmVuY2Uobm9kZSwgbmV4dE5vZGUpO1xuICAgICAgY29uc3QgRVhQRUNURURfTElORV9ESUZGRVJFTkNFID0gb3B0aW9ucy5jb3VudCArIDE7XG5cbiAgICAgIGlmIChsaW5lRGlmZmVyZW5jZSA8IEVYUEVDVEVEX0xJTkVfRElGRkVSRU5DRSkge1xuICAgICAgICBsZXQgY29sdW1uID0gbm9kZS5sb2Muc3RhcnQuY29sdW1uO1xuXG4gICAgICAgIGlmIChub2RlLmxvYy5zdGFydC5saW5lICE9PSBub2RlLmxvYy5lbmQubGluZSkge1xuICAgICAgICAgIGNvbHVtbiA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZXh0LnJlcG9ydCh7XG4gICAgICAgICAgbG9jOiB7XG4gICAgICAgICAgICBsaW5lOiBub2RlLmxvYy5lbmQubGluZSxcbiAgICAgICAgICAgIGNvbHVtbixcbiAgICAgICAgICB9LFxuICAgICAgICAgIG1lc3NhZ2U6IGBFeHBlY3RlZCAke29wdGlvbnMuY291bnR9IGVtcHR5IGxpbmUke29wdGlvbnMuY291bnQgPiAxID8gJ3MnIDogJyd9IGFmdGVyICR7dHlwZX0gc3RhdGVtZW50IG5vdCBmb2xsb3dlZCBieSBhbm90aGVyICR7dHlwZX0uYCxcbiAgICAgICAgICBmaXg6IGZpeGVyID0+IGZpeGVyLmluc2VydFRleHRBZnRlcihcbiAgICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgICAnXFxuJy5yZXBlYXQoRVhQRUNURURfTElORV9ESUZGRVJFTkNFIC0gbGluZURpZmZlcmVuY2UpLFxuICAgICAgICAgICksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbW1lbnRBZnRlckltcG9ydChub2RlLCBuZXh0Q29tbWVudCkge1xuICAgICAgY29uc3QgbGluZURpZmZlcmVuY2UgPSBnZXRMaW5lRGlmZmVyZW5jZShub2RlLCBuZXh0Q29tbWVudCk7XG4gICAgICBjb25zdCBFWFBFQ1RFRF9MSU5FX0RJRkZFUkVOQ0UgPSBvcHRpb25zLmNvdW50ICsgMTtcblxuICAgICAgaWYgKGxpbmVEaWZmZXJlbmNlIDwgRVhQRUNURURfTElORV9ESUZGRVJFTkNFKSB7XG4gICAgICAgIGxldCBjb2x1bW4gPSBub2RlLmxvYy5zdGFydC5jb2x1bW47XG5cbiAgICAgICAgaWYgKG5vZGUubG9jLnN0YXJ0LmxpbmUgIT09IG5vZGUubG9jLmVuZC5saW5lKSB7XG4gICAgICAgICAgY29sdW1uID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRleHQucmVwb3J0KHtcbiAgICAgICAgICBsb2M6IHtcbiAgICAgICAgICAgIGxpbmU6IG5vZGUubG9jLmVuZC5saW5lLFxuICAgICAgICAgICAgY29sdW1uLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgbWVzc2FnZTogYEV4cGVjdGVkICR7b3B0aW9ucy5jb3VudH0gZW1wdHkgbGluZSR7b3B0aW9ucy5jb3VudCA+IDEgPyAncycgOiAnJ30gYWZ0ZXIgaW1wb3J0IHN0YXRlbWVudCBub3QgZm9sbG93ZWQgYnkgYW5vdGhlciBpbXBvcnQuYCxcbiAgICAgICAgICBmaXg6IGZpeGVyID0+IGZpeGVyLmluc2VydFRleHRBZnRlcihcbiAgICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgICAnXFxuJy5yZXBlYXQoRVhQRUNURURfTElORV9ESUZGRVJFTkNFIC0gbGluZURpZmZlcmVuY2UpLFxuICAgICAgICAgICksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluY3JlbWVudExldmVsKCkge1xuICAgICAgbGV2ZWwrKztcbiAgICB9XG4gICAgZnVuY3Rpb24gZGVjcmVtZW50TGV2ZWwoKSB7XG4gICAgICBsZXZlbC0tO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNoZWNrSW1wb3J0KG5vZGUpIHtcbiAgICAgIGNvbnN0IHsgcGFyZW50IH0gPSBub2RlO1xuICAgICAgY29uc3Qgbm9kZVBvc2l0aW9uID0gcGFyZW50LmJvZHkuaW5kZXhPZihub2RlKTtcbiAgICAgIGNvbnN0IG5leHROb2RlID0gcGFyZW50LmJvZHlbbm9kZVBvc2l0aW9uICsgMV07XG4gICAgICBjb25zdCBlbmRMaW5lID0gbm9kZS5sb2MuZW5kLmxpbmU7XG4gICAgICBsZXQgbmV4dENvbW1lbnQ7XG5cbiAgICAgIGlmICh0eXBlb2YgcGFyZW50LmNvbW1lbnRzICE9PSAndW5kZWZpbmVkJyAmJiBvcHRpb25zLmNvbnNpZGVyQ29tbWVudHMpIHtcbiAgICAgICAgbmV4dENvbW1lbnQgPSBwYXJlbnQuY29tbWVudHMuZmluZChvID0+IG8ubG9jLnN0YXJ0LmxpbmUgPT09IGVuZExpbmUgKyAxKTtcbiAgICAgIH1cblxuXG4gICAgICAvLyBza2lwIFwiZXhwb3J0IGltcG9ydFwic1xuICAgICAgaWYgKG5vZGUudHlwZSA9PT0gJ1RTSW1wb3J0RXF1YWxzRGVjbGFyYXRpb24nICYmIG5vZGUuaXNFeHBvcnQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAobmV4dENvbW1lbnQgJiYgdHlwZW9mIG5leHRDb21tZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBjb21tZW50QWZ0ZXJJbXBvcnQobm9kZSwgbmV4dENvbW1lbnQpO1xuICAgICAgfSBlbHNlIGlmIChuZXh0Tm9kZSAmJiBuZXh0Tm9kZS50eXBlICE9PSAnSW1wb3J0RGVjbGFyYXRpb24nICYmIChuZXh0Tm9kZS50eXBlICE9PSAnVFNJbXBvcnRFcXVhbHNEZWNsYXJhdGlvbicgfHwgbmV4dE5vZGUuaXNFeHBvcnQpKSB7XG4gICAgICAgIGNoZWNrRm9yTmV3TGluZShub2RlLCBuZXh0Tm9kZSwgJ2ltcG9ydCcpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBJbXBvcnREZWNsYXJhdGlvbjogY2hlY2tJbXBvcnQsXG4gICAgICBUU0ltcG9ydEVxdWFsc0RlY2xhcmF0aW9uOiBjaGVja0ltcG9ydCxcbiAgICAgIENhbGxFeHByZXNzaW9uKG5vZGUpIHtcbiAgICAgICAgaWYgKGlzU3RhdGljUmVxdWlyZShub2RlKSAmJiBsZXZlbCA9PT0gMCkge1xuICAgICAgICAgIHJlcXVpcmVDYWxscy5wdXNoKG5vZGUpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgJ1Byb2dyYW06ZXhpdCc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbG9nKCdleGl0IHByb2Nlc3NpbmcgZm9yJywgY29udGV4dC5nZXRQaHlzaWNhbEZpbGVuYW1lID8gY29udGV4dC5nZXRQaHlzaWNhbEZpbGVuYW1lKCkgOiBjb250ZXh0LmdldEZpbGVuYW1lKCkpO1xuICAgICAgICBjb25zdCBzY29wZUJvZHkgPSBnZXRTY29wZUJvZHkoY29udGV4dC5nZXRTY29wZSgpKTtcbiAgICAgICAgbG9nKCdnb3Qgc2NvcGU6Jywgc2NvcGVCb2R5KTtcblxuICAgICAgICByZXF1aXJlQ2FsbHMuZm9yRWFjaChmdW5jdGlvbiAobm9kZSwgaW5kZXgpIHtcbiAgICAgICAgICBjb25zdCBub2RlUG9zaXRpb24gPSBmaW5kTm9kZUluZGV4SW5TY29wZUJvZHkoc2NvcGVCb2R5LCBub2RlKTtcbiAgICAgICAgICBsb2coJ25vZGUgcG9zaXRpb24gaW4gc2NvcGU6Jywgbm9kZVBvc2l0aW9uKTtcblxuICAgICAgICAgIGNvbnN0IHN0YXRlbWVudFdpdGhSZXF1aXJlQ2FsbCA9IHNjb3BlQm9keVtub2RlUG9zaXRpb25dO1xuICAgICAgICAgIGNvbnN0IG5leHRTdGF0ZW1lbnQgPSBzY29wZUJvZHlbbm9kZVBvc2l0aW9uICsgMV07XG4gICAgICAgICAgY29uc3QgbmV4dFJlcXVpcmVDYWxsID0gcmVxdWlyZUNhbGxzW2luZGV4ICsgMV07XG5cbiAgICAgICAgICBpZiAobmV4dFJlcXVpcmVDYWxsICYmIGNvbnRhaW5zTm9kZU9yRXF1YWwoc3RhdGVtZW50V2l0aFJlcXVpcmVDYWxsLCBuZXh0UmVxdWlyZUNhbGwpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG5leHRTdGF0ZW1lbnQgJiZcbiAgICAgICAgICAgICAoIW5leHRSZXF1aXJlQ2FsbCB8fCAhY29udGFpbnNOb2RlT3JFcXVhbChuZXh0U3RhdGVtZW50LCBuZXh0UmVxdWlyZUNhbGwpKSkge1xuXG4gICAgICAgICAgICBjaGVja0Zvck5ld0xpbmUoc3RhdGVtZW50V2l0aFJlcXVpcmVDYWxsLCBuZXh0U3RhdGVtZW50LCAncmVxdWlyZScpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgICAgRnVuY3Rpb25EZWNsYXJhdGlvbjogaW5jcmVtZW50TGV2ZWwsXG4gICAgICBGdW5jdGlvbkV4cHJlc3Npb246IGluY3JlbWVudExldmVsLFxuICAgICAgQXJyb3dGdW5jdGlvbkV4cHJlc3Npb246IGluY3JlbWVudExldmVsLFxuICAgICAgQmxvY2tTdGF0ZW1lbnQ6IGluY3JlbWVudExldmVsLFxuICAgICAgT2JqZWN0RXhwcmVzc2lvbjogaW5jcmVtZW50TGV2ZWwsXG4gICAgICBEZWNvcmF0b3I6IGluY3JlbWVudExldmVsLFxuICAgICAgJ0Z1bmN0aW9uRGVjbGFyYXRpb246ZXhpdCc6IGRlY3JlbWVudExldmVsLFxuICAgICAgJ0Z1bmN0aW9uRXhwcmVzc2lvbjpleGl0JzogZGVjcmVtZW50TGV2ZWwsXG4gICAgICAnQXJyb3dGdW5jdGlvbkV4cHJlc3Npb246ZXhpdCc6IGRlY3JlbWVudExldmVsLFxuICAgICAgJ0Jsb2NrU3RhdGVtZW50OmV4aXQnOiBkZWNyZW1lbnRMZXZlbCxcbiAgICAgICdPYmplY3RFeHByZXNzaW9uOmV4aXQnOiBkZWNyZW1lbnRMZXZlbCxcbiAgICAgICdEZWNvcmF0b3I6ZXhpdCc6IGRlY3JlbWVudExldmVsLFxuICAgIH07XG4gIH0sXG59O1xuIl19