(function() {
  angular.module("cropme", ["ngSanitize"]).directive("cropme", [
    "$window", "$timeout", "$rootScope", function($window, $timeout, $rootScope) {
      var borderSensitivity, checkScopeVariables, minHeight, offset;
      minHeight = 100;
      borderSensitivity = 8;
      checkScopeVariables = function(scope) {
        if (scope.destinationHeight) {
          if (scope.ratio) {
            throw "You can't specify both destinationHeight and ratio, destinationHeight = destinationWidth * ratio";
          } else {
            scope.ratio = destinationHeight / destinationWidth;
          }
        } else if (scope.ratio) {
          scope.destinationHeight = scope.destinationWidth * scope.ratio;
        }
        if (scope.ratio && scope.height && scope.destinationHeight > scope.height) {
          throw "Can't initialize cropme: destinationWidth x ratio needs to be lower than height";
        }
        if (scope.destinationWidth > scope.width) {
          throw "Can't initialize cropme: destinationWidth needs to be lower than width";
        }
        if (scope.ratio && !scope.height) {
          scope.height = scope.destinationHeight;
        }
        return scope.type || (scope.type = "png");
      };
      offset = function(el) {
        var offsetLeft, offsetTop;
        offsetTop = 0;
        offsetLeft = 0;
        while (el) {
          offsetTop += el.offsetTop;
          offsetLeft += el.offsetLeft;
          el = el.offsetParent;
        }
        return {
          top: offsetTop,
          left: offsetLeft
        };
      };
      return {
        template: "<div\n	class=\"step-1\"\n	ng-show=\"state == 'step-1'\"\n	ng-style=\"{'width': width + 'px', 'height': height + 'px'}\">\n	<dropbox ng-class=\"dropClass\"></dropbox>\n	<div class=\"cropme-error\" ng-bind-html=\"dropError\"></div>\n	<div class=\"cropme-file-input\">\n		<input type=\"file\"/>\n		<div\n			class=\"cropme-button\"\n			ng-click=\"browseFiles()\">\n				Browse picture\n		</div>\n		<div class=\"cropme-or\">or</div>\n		<div class=\"cropme-label\" ng-class=\"iconClass\">{{dropText}}</div>\n	</div>\n</div>\n<div\n	class=\"step-2\"\n	ng-show=\"state == 'step-2'\"\n	ng-style=\"{'width': width + 'px'}\"\n	ng-mousemove=\"mousemove($event)\"\n	ng-mousedown=\"mousedown($event)\"\n	ng-mouseup=\"mouseup($event)\"\n	ng-mouseleave=\"deselect()\"\n	ng-class=\"{'col-resize': colResizePointer}\">\n	<img ng-src=\"{{imgSrc}}\" ng-style=\"{'width': width + 'px'}\"/>\n	<div class=\"overlay-tile\" ng-style=\"{'top': 0, 'left': 0, 'width': xCropZone + 'px', 'height': yCropZone + 'px'}\"></div>\n	<div class=\"overlay-tile\" ng-style=\"{'top': 0, 'left': xCropZone + 'px', 'width': widthCropZone + 'px', 'height': yCropZone + 'px'}\"></div>\n	<div class=\"overlay-tile\" ng-style=\"{'top': 0, 'left': xCropZone + widthCropZone + 'px', 'right': 0, 'height': yCropZone + 'px'}\"></div>\n	<div class=\"overlay-tile\" ng-style=\"{'top': yCropZone + 'px', 'left': xCropZone + widthCropZone + 'px', 'right': 0, 'height': heightCropZone + 'px'}\"></div>\n	<div class=\"overlay-tile\" ng-style=\"{'top': yCropZone + heightCropZone + 'px', 'left': xCropZone + widthCropZone + 'px', 'right': 0, 'bottom': 0}\"></div>\n	<div class=\"overlay-tile\" ng-style=\"{'top': yCropZone + heightCropZone + 'px', 'left': xCropZone + 'px', 'width': widthCropZone + 'px', 'bottom': 0}\"></div>\n	<div class=\"overlay-tile\" ng-style=\"{'top': yCropZone + heightCropZone + 'px', 'left': 0, 'width': xCropZone + 'px', 'bottom': 0}\"></div>\n	<div class=\"overlay-tile\" ng-style=\"{'top': yCropZone + 'px', 'left': 0, 'width': xCropZone + 'px', 'height': heightCropZone + 'px'}\"></div>\n	<div class=\"overlay-border\" ng-style=\"{'top': (yCropZone - 2) + 'px', 'left': (xCropZone - 2) + 'px', 'width': widthCropZone + 'px', 'height': heightCropZone + 'px'}\"></div>\n</div>\n<div class=\"cropme-actions\" ng-show=\"state == 'step-2'\">\n	<button id=\"cropme-cancel\" ng-click=\"cancel($event)\">Cancel</button>\n	<button id=\"cropme-ok\" ng-click=\"ok($event)\">Ok</button>\n</div>\n<canvas\n	width=\"{{destinationWidth}}\"\n	height=\"{{destinationHeight}}\"\n	ng-style=\"{'width': destinationWidth + 'px', 'height': destinationHeight + 'px'}\">\n</canvas>",
        restrict: "E",
        scope: {
          width: "=",
          minWidth: "=",
          destinationWidth: "=",
          minHeight: "=?",
          height: "=?",
          destinationHeight: "=?",
          iconClass: "=?",
          ratio: "=?",
          type: "=?"
        },
        link: function(scope, element, attributes) {
          var $input, canvasEl, checkBounds, checkHRatio, checkVRatio, ctx, draggingFn, elOffset, grabbedBorder, heightWithImage, imageAreaEl, imageEl, isNearBorders, moveBorders, moveCropZone, nearHSegment, nearVSegment, startCropping, zoom;
          scope.dropText = "Drop picture here";
          scope.state = "step-1";
          draggingFn = null;
          grabbedBorder = null;
          heightWithImage = null;
          zoom = null;
          elOffset = null;
          imageEl = element.find('img')[0];
          canvasEl = element.find("canvas")[0];
          ctx = canvasEl.getContext("2d");
          startCropping = function(imageWidth, imageHeight) {
            zoom = scope.width / imageWidth;
            heightWithImage = imageHeight * zoom;
            scope.widthCropZone = Math.round(scope.destinationWidth * zoom);
            scope.heightCropZone = Math.round((scope.destinationHeight || minHeight) * zoom);
            scope.xCropZone = Math.round((scope.width - scope.widthCropZone) / 2);
            scope.yCropZone = Math.round((scope.height - scope.heightCropZone) / 2);
            return $timeout(function() {
              return elOffset = offset(imageAreaEl);
            });
          };
          imageAreaEl = element[0].getElementsByClassName("step-2")[0];
          checkScopeVariables(scope);
          $input = element.find("input");
          $input.bind("change", function() {
            var file;
            file = this.files[0];
            return scope.$apply(function() {
              return scope.setFiles(file);
            });
          });
          $input.bind("click", function(e) {
            e.stopPropagation();
            return $input.val("");
          });
          scope.browseFiles = function() {
            return $input[0].click();
          };
          scope.setFiles = function(file) {
            var reader;
            if (!file.type.match(/^image\//)) {
              return scope.dropError = "Wrong file type, please select an image.";
            }
            scope.dropError = "";
            reader = new FileReader;
            reader.onload = function(e) {
              imageEl.onload = function() {
                var errors, height, width;
                width = imageEl.naturalWidth;
                height = imageEl.naturalHeight;
                errors = [];
                if (width < scope.minWidth) {
                  errors.push("The photo uploaded is too small in width, please try uploading another image");
                }
                else if (scope.minHeight && height < scope.minHeight) {
                    errors.push("The photo uploaded is too small in height, please try uploading another image");
                }
                else if (scope.ratio && scope.destinationHeight > height) {
                  errors.push("The photo uploaded is too small in height, please try uploading another image");
                }
                return scope.$apply(function() {
                  if (errors.length) {
                    return scope.dropError = errors.join("<br/>");
                  } else {
                    $rootScope.$broadcast("cropme:loaded", width, height);
                    scope.state = "step-2";
                    return startCropping(width, height);
                  }
                });
              };
              return scope.$apply(function() {
                return scope.imgSrc = e.target.result;
              });
            };
            return reader.readAsDataURL(file);
          };
          moveCropZone = function(ev) {
            scope.xCropZone = ev.pageX - elOffset.left - scope.widthCropZone / 2;
            scope.yCropZone = ev.pageY - elOffset.top - scope.heightCropZone / 2;
            return checkBounds();
          };
          moveBorders = {
            top: function(ev) {
              var y;
              y = ev.pageY - elOffset.top;
              scope.heightCropZone += scope.yCropZone - y;
              scope.yCropZone = y;
              checkVRatio();
              return checkBounds();
            },
            right: function(ev) {
              var x;
              x = ev.pageX - elOffset.left;
              scope.widthCropZone = x - scope.xCropZone;
              checkHRatio();
              return checkBounds();
            },
            bottom: function(ev) {
              var y;
              y = ev.pageY - elOffset.top;
              scope.heightCropZone = y - scope.yCropZone;
              checkVRatio();
              return checkBounds();
            },
            left: function(ev) {
              var x;
              x = ev.pageX - elOffset.left;
              scope.widthCropZone += scope.xCropZone - x;
              scope.xCropZone = x;
              checkHRatio();
              return checkBounds();
            }
          };
          checkHRatio = function() {
            if (scope.ratio) {
              return scope.heightCropZone = scope.widthCropZone * scope.ratio;
            }
          };
          checkVRatio = function() {
            if (scope.ratio) {
              return scope.widthCropZone = scope.heightCropZone / scope.ratio;
            }
          };
          checkBounds = function() {
            if (scope.xCropZone < 0) {
              scope.xCropZone = 0;
            }
            if (scope.yCropZone < 0) {
              scope.yCropZone = 0;
            }
            if (scope.widthCropZone < scope.destinationWidth * zoom) {
              scope.widthCropZone = scope.destinationWidth * zoom;
              checkHRatio();
            } else if (scope.destinationHeight && scope.heightCropZone < scope.destinationHeight * zoom) {
              scope.heightCropZone = scope.destinationHeight * zoom;
              checkVRatio();
            }
            if (scope.xCropZone + scope.widthCropZone > scope.width) {
              scope.xCropZone = scope.width - scope.widthCropZone;
              if (scope.xCropZone < 0) {
                scope.widthCropZone = scope.width;
                scope.xCropZone = 0;
                checkHRatio();
              }
            }
            if (scope.yCropZone + scope.heightCropZone > heightWithImage) {
              scope.yCropZone = heightWithImage - scope.heightCropZone;
              if (scope.yCropZone < 0) {
                scope.heightCropZone = heightWithImage;
                scope.yCropZone = 0;
                return checkVRatio();
              }
            }
          };
          isNearBorders = function(ev) {
            var bottomLeft, bottomRight, h, topLeft, topRight, w, x, y;
            x = scope.xCropZone + elOffset.left;
            y = scope.yCropZone + elOffset.top;
            w = scope.widthCropZone;
            h = scope.heightCropZone;
            topLeft = {
              x: x,
              y: y
            };
            topRight = {
              x: x + w,
              y: y
            };
            bottomLeft = {
              x: x,
              y: y + h
            };
            bottomRight = {
              x: x + w,
              y: y + h
            };
            return nearHSegment(ev, x, w, y, "top") || nearVSegment(ev, y, h, x + w, "right") || nearHSegment(ev, x, w, y + h, "bottom") || nearVSegment(ev, y, h, x, "left");
          };
          nearHSegment = function(ev, x, w, y, borderName) {
            if (ev.pageX >= x && ev.pageX <= x + w && Math.abs(ev.pageY - y) <= borderSensitivity) {
              return borderName;
            }
          };
          nearVSegment = function(ev, y, h, x, borderName) {
            if (ev.pageY >= y && ev.pageY <= y + h && Math.abs(ev.pageX - x) <= borderSensitivity) {
              return borderName;
            }
          };
          scope.mousedown = function(e) {
            grabbedBorder = isNearBorders(e);
            if (grabbedBorder) {
              draggingFn = moveBorders[grabbedBorder];
            } else {
              draggingFn = moveCropZone;
            }
            return draggingFn(e);
          };
          scope.mouseup = function(e) {
            if (draggingFn) {
              draggingFn(e);
            }
            return draggingFn = null;
          };
          scope.mousemove = function(e) {
            if (draggingFn) {
              draggingFn(e);
            }
            return scope.colResizePointer = isNearBorders(e);
          };
          scope.deselect = function() {
            return draggingFn = null;
          };
          scope.cancel = function($event) {
            if ($event) {
              $event.preventDefault();
            }
            scope.dropText = "Drop files here";
            scope.dropClass = "";
            return scope.state = "step-1";
          };
          scope.ok = function($event) {
            if ($event) {
              $event.preventDefault();
            }
            scope.croppedWidth = scope.widthCropZone / zoom;
            scope.croppedHeight = scope.heightCropZone / zoom;
            return $timeout(function() {
              var destinationHeight;
              destinationHeight = scope.destinationHeight || scope.destinationWidth * scope.croppedHeight / scope.croppedWidth;
              ctx.drawImage(imageEl, scope.xCropZone / zoom, scope.yCropZone / zoom, scope.croppedWidth, scope.croppedHeight, 0, 0, scope.destinationWidth, scope.destinationHeight);
              return canvasEl.toBlob(function(blob) {
                return $rootScope.$broadcast("cropme:done", blob);
              }, 'image/' + scope.type);
            });
          };
          scope.$on("cropme:cancel", scope.cancel);
          return scope.$on("cropme:ok", scope.ok);
        }
      };
    }
  ]);

  angular.module("cropme").directive("dropbox", function() {
    return {
      restrict: "E",
      link: function(scope, element, attributes) {
        var dragEnterLeave, dropbox;
        dragEnterLeave = function(evt) {
          evt.stopPropagation();
          evt.preventDefault();
          return scope.$apply(function() {
            scope.dropText = "Drop files here";
            return scope.dropClass = "";
          });
        };
        dropbox = element[0];
        scope.dropText = "Drop files here";
        dropbox.addEventListener("dragenter", dragEnterLeave, false);
        dropbox.addEventListener("dragleave", dragEnterLeave, false);
        dropbox.addEventListener("dragover", (function(evt) {
          var ok;
          evt.stopPropagation();
          evt.preventDefault();
          ok = evt.dataTransfer && evt.dataTransfer.types && evt.dataTransfer.types.indexOf("Files") >= 0;
          return scope.$apply(function() {
            scope.dropText = (ok ? "Drop now" : "Only files are allowed");
            return scope.dropClass = (ok ? "over" : "not-available");
          });
        }), false);
        return dropbox.addEventListener("drop", (function(evt) {
          var files;
          evt.stopPropagation();
          evt.preventDefault();
          scope.$apply(function() {
            scope.dropText = "Drop files here";
            return scope.dropClass = "";
          });
          files = evt.dataTransfer.files;
          return scope.$apply(function() {
            var file, _i, _len;
            if (files.length > 0) {
              for (_i = 0, _len = files.length; _i < _len; _i++) {
                file = files[_i];
                if (file.type.match(/^image\//)) {
                  scope.dropText = "Loading image...";
                  scope.dropClass = "loading";
                  return scope.setFiles(file);
                }
                scope.dropError = "Wrong file type, please drop at least an image.";
              }
            }
          });
        }), false);
      }
    };
  });

  (function(view) {
    "use strict";
    var HTMLCanvasElement, Uint8Array, base64_ranks, decode_base64, is_base64_regex;
    Uint8Array = view.Uint8Array;
    HTMLCanvasElement = view.HTMLCanvasElement;
    is_base64_regex = /\s*;\s*base64\s*(?:;|$)/i;
    base64_ranks = void 0;
    decode_base64 = function(base64) {
      var buffer, code, i, last, len, outptr, rank, save, state, undef;
      len = base64.length;
      buffer = new Uint8Array(len / 4 * 3 | 0);
      i = 0;
      outptr = 0;
      last = [0, 0];
      state = 0;
      save = 0;
      rank = void 0;
      code = void 0;
      undef = void 0;
      while (len--) {
        code = base64.charCodeAt(i++);
        rank = base64_ranks[code - 43];
        if (rank !== 255 && rank !== undef) {
          last[1] = last[0];
          last[0] = code;
          save = (save << 6) | rank;
          state++;
          if (state === 4) {
            buffer[outptr++] = save >>> 16;
            if (last[1] !== 61) {
              buffer[outptr++] = save >>> 8;
            }
            if (last[0] !== 61) {
              buffer[outptr++] = save;
            }
            state = 0;
          }
        }
      }
      return buffer;
    };
    if (Uint8Array) {
      base64_ranks = new Uint8Array([62, -1, -1, -1, 63, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, 0, -1, -1, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1, -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51]);
    }
    if (HTMLCanvasElement && !HTMLCanvasElement.prototype.toBlob) {
      return HTMLCanvasElement.prototype.toBlob = function(callback, type) {
        var args, blob, data, dataURI, header_end, is_base64;
        if (!type) {
          type = "image/png";
        }
        if (this.mozGetAsFile) {
          callback(this.mozGetAsFile("canvas", type));
          return;
        }
        args = Array.prototype.slice.call(arguments, 1);
        dataURI = this.toDataURL.apply(this, args);
        header_end = dataURI.indexOf(",");
        data = dataURI.substring(header_end + 1);
        is_base64 = is_base64_regex.test(dataURI.substring(0, header_end));
        blob = void 0;
        if (Blob.fake) {
          blob = new Blob;
          if (is_base64) {
            blob.encoding = "base64";
          } else {
            blob.encoding = "URI";
          }
          blob.data = data;
          blob.size = data.length;
        } else if (Uint8Array) {
          if (is_base64) {
            blob = new Blob([decode_base64(data)], {
              type: type
            });
          } else {
            blob = new Blob([decodeURIComponent(data)], {
              type: type
            });
          }
        }
        return callback(blob);
      };
    }
  })(self);

}).call(this);
