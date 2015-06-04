(function(window) {
	function CanvasMask(canvasBoxId, canvasId, maskImgSrc, isClip) {
		var _this = this;
		_this.gap = 40; //擦除单位面积
		_this.timeout = null; //定时器对象
		_this.interval = 100; //计算蒙版面积时间间隔（毫秒）
		_this.isClip = isClip; //是否裁剪蒙版，使之最好的适应屏幕
		_this.number = 0.6; //未擦除面积小于时，关闭蒙版
		//事件兼容处理
		_this.hasTouch = "ontouchstart" in window ? true : false;
		_this.events = {
			touchstart: _this.hasTouch ? "touchstart" : "mousedown",
			touchmove: _this.hasTouch ? "touchmove" : "mousemove",
			touchend: _this.hasTouch ? "touchend" : "mouseup"
		};
		_this.canvasBox = document.getElementById(canvasBoxId);
		_this.canvas = document.getElementById(canvasId);
		_this.loading = document.getElementById('loading');
		_this.ctx = _this.canvas.getContext("2d");
		//得到分辨率
		_this.ratio = (function(context) {
			var backingStore = context.backingStorePixelRatio ||
				context.webkitBackingStorePixelRatio ||
				context.mozBackingStorePixelRatio ||
				context.msBackingStorePixelRatio ||
				context.oBackingStorePixelRatio ||
				context.backingStorePixelRatio || 1;
			return (window.devicePixelRatio || 1) / backingStore;
		})(_this.ctx);
		_this.gap = _this.gap * _this.ratio;
		_this.imgSrc = maskImgSrc || _this.canvas.getAttribute("imgsrc");
		_this.width = _this.canvasBox.clientWidth * _this.ratio;
		_this.height = _this.canvasBox.clientHeight * _this.ratio;
		_this.canvas.width = _this.width;
		_this.canvas.height = _this.height;
		_this.canvasBox.style.zoom = 1 / _this.ratio;
		_this.left = parseInt(_this.canvas.offsetLeft) * _this.ratio;
		_this.top = parseInt(_this.canvas.offsetTop) * _this.ratio;
		_this.needDraw = false;
		_this.init();
	}
	CanvasMask.prototype = {
		init: function() {
			var _this = this;
			var img = document.createElement('img');
			//加载并蒙版图片
			img.onload = function() {
				if (_this.isClip) {
					var nw = img.naturalWidth || img.width;
					var nh = img.naturalHeight || img.height;
					var cw, ch;
					if (_this.width / nw > _this.height / nh) {
						cw = nw;
						ch = cw / _this.width * _this.height;
					} else {
						ch = nh;
						cw = ch / _this.height * _this.width;
					}
					_this.ctx.drawImage(img, Math.round((nw - cw) / 2), Math.round((nh - ch) / 2), cw, ch, 0, 0, _this.width, _this.height);
				} else {
					_this.ctx.drawImage(img, 0, 0, nw, nh, 0, 0, _this.width, _this.height);
				}
				_this.ctx.lineCap = "round";
				_this.ctx.lineJoin = "round";
				_this.ctx.lineWidth = _this.gap;
				_this.ctx.globalCompositeOperation = "destination-out";
				if (_this.loading) {
					_this.loading.parentNode.removeChild(_this.loading);
				}
			}
			img.onabort = img.onerror = function(){
				if (_this.loading) {
					_this.loading.parentNode.removeChild(_this.loading);
				}
			}
			img.src = _this.imgSrc;
			//手指按下
			_this.canvas.addEventListener(_this.events.touchstart, function(e) {
				e.preventDefault();
				_this.needDraw = true;
				_this.ctx.beginPath();
				var clientX = 0,
					clientY = 0;
				if (e.targetTouches && e.targetTouches[0]) {
					clientX = e.targetTouches[0].clientX;
					clientY = e.targetTouches[0].clientY;
				} else {
					clientX = e.clientX;
					clientY = e.clientY;
				}
				_this.ctx.save();
				_this.ctx.moveTo(clientX * _this.ratio - _this.left, clientY * _this.ratio - _this.top);
			}, false);
			//手指滑过
			_this.canvas.addEventListener(_this.events.touchmove, function(e) {
				e.preventDefault();
				if (_this.needDraw) {
					var clientX = 0,
						clientY = 0;
					if (e.targetTouches && e.targetTouches[0]) {
						clientX = e.targetTouches[0].clientX;
						clientY = e.targetTouches[0].clientY;
					} else {
						clientX = e.clientX;
						clientY = e.clientY;
					}
					_this.ctx.lineTo(clientX * _this.ratio - _this.left, clientY * _this.ratio - _this.top);
					_this.ctx.stroke();
					_this.ctx.restore();
					_this.square();
				}
			}, false);
			//手指离开
			_this.canvas.addEventListener(_this.events.touchend, function(e) {
				e.preventDefault();
				_this.needDraw = false;
				_this.square();
			});
		},
		square: function() { //计算擦除的面积
			var _this = this;
			if (_this.timeout) {
				clearTimeout(_this.timeout);
				_this.timeout = null;
			}
			_this.timeout = setTimeout(function() {
				var imgData = _this.ctx.getImageData(0, 0, _this.width, _this.height);
				var num = 0;
				for (var x = 0; x < imgData.width; x += _this.gap) {
					for (var y = 0; y < imgData.height; y += _this.gap) {
						var i = (y * imgData.width + x) * 4;
						if (imgData.data[i + 3] > 0) {
							num++
						}
					}
				}
				//如果擦除百分之X以上，则关闭蒙版
				if (num / (imgData.width * imgData.height / (_this.gap * _this.gap)) < _this.number) {
					_this.canvasBox.className = "noOp";
					setTimeout(function() {
						if (_this.canvasBox) {
							_this.canvasBox.parentNode.removeChild(_this.canvasBox);
							_this.canvasBox = 0;
						}
					}, 500);
				}
			}, _this.interval)
		}
	};
	window.CanvasMask = function() {
		return new CanvasMask(arguments[0], arguments[1], arguments[2], arguments[3]);
	};
})(window);