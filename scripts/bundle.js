(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/* MIT license */
var cssKeywords = require('color-name');

// NOTE: conversions should only return primitive values (i.e. arrays, or
//       values that give correct `typeof` results).
//       do not use box values types (i.e. Number(), String(), etc.)

var reverseKeywords = {};
for (var key in cssKeywords) {
	if (cssKeywords.hasOwnProperty(key)) {
		reverseKeywords[cssKeywords[key]] = key;
	}
}

var convert = module.exports = {
	rgb: {channels: 3, labels: 'rgb'},
	hsl: {channels: 3, labels: 'hsl'},
	hsv: {channels: 3, labels: 'hsv'},
	hwb: {channels: 3, labels: 'hwb'},
	cmyk: {channels: 4, labels: 'cmyk'},
	xyz: {channels: 3, labels: 'xyz'},
	lab: {channels: 3, labels: 'lab'},
	lch: {channels: 3, labels: 'lch'},
	hex: {channels: 1, labels: ['hex']},
	keyword: {channels: 1, labels: ['keyword']},
	ansi16: {channels: 1, labels: ['ansi16']},
	ansi256: {channels: 1, labels: ['ansi256']},
	hcg: {channels: 3, labels: ['h', 'c', 'g']},
	apple: {channels: 3, labels: ['r16', 'g16', 'b16']},
	gray: {channels: 1, labels: ['gray']}
};

// hide .channels and .labels properties
for (var model in convert) {
	if (convert.hasOwnProperty(model)) {
		if (!('channels' in convert[model])) {
			throw new Error('missing channels property: ' + model);
		}

		if (!('labels' in convert[model])) {
			throw new Error('missing channel labels property: ' + model);
		}

		if (convert[model].labels.length !== convert[model].channels) {
			throw new Error('channel and label counts mismatch: ' + model);
		}

		var channels = convert[model].channels;
		var labels = convert[model].labels;
		delete convert[model].channels;
		delete convert[model].labels;
		Object.defineProperty(convert[model], 'channels', {value: channels});
		Object.defineProperty(convert[model], 'labels', {value: labels});
	}
}

convert.rgb.hsl = function (rgb) {
	var r = rgb[0] / 255;
	var g = rgb[1] / 255;
	var b = rgb[2] / 255;
	var min = Math.min(r, g, b);
	var max = Math.max(r, g, b);
	var delta = max - min;
	var h;
	var s;
	var l;

	if (max === min) {
		h = 0;
	} else if (r === max) {
		h = (g - b) / delta;
	} else if (g === max) {
		h = 2 + (b - r) / delta;
	} else if (b === max) {
		h = 4 + (r - g) / delta;
	}

	h = Math.min(h * 60, 360);

	if (h < 0) {
		h += 360;
	}

	l = (min + max) / 2;

	if (max === min) {
		s = 0;
	} else if (l <= 0.5) {
		s = delta / (max + min);
	} else {
		s = delta / (2 - max - min);
	}

	return [h, s * 100, l * 100];
};

convert.rgb.hsv = function (rgb) {
	var rdif;
	var gdif;
	var bdif;
	var h;
	var s;

	var r = rgb[0] / 255;
	var g = rgb[1] / 255;
	var b = rgb[2] / 255;
	var v = Math.max(r, g, b);
	var diff = v - Math.min(r, g, b);
	var diffc = function (c) {
		return (v - c) / 6 / diff + 1 / 2;
	};

	if (diff === 0) {
		h = s = 0;
	} else {
		s = diff / v;
		rdif = diffc(r);
		gdif = diffc(g);
		bdif = diffc(b);

		if (r === v) {
			h = bdif - gdif;
		} else if (g === v) {
			h = (1 / 3) + rdif - bdif;
		} else if (b === v) {
			h = (2 / 3) + gdif - rdif;
		}
		if (h < 0) {
			h += 1;
		} else if (h > 1) {
			h -= 1;
		}
	}

	return [
		h * 360,
		s * 100,
		v * 100
	];
};

convert.rgb.hwb = function (rgb) {
	var r = rgb[0];
	var g = rgb[1];
	var b = rgb[2];
	var h = convert.rgb.hsl(rgb)[0];
	var w = 1 / 255 * Math.min(r, Math.min(g, b));

	b = 1 - 1 / 255 * Math.max(r, Math.max(g, b));

	return [h, w * 100, b * 100];
};

convert.rgb.cmyk = function (rgb) {
	var r = rgb[0] / 255;
	var g = rgb[1] / 255;
	var b = rgb[2] / 255;
	var c;
	var m;
	var y;
	var k;

	k = Math.min(1 - r, 1 - g, 1 - b);
	c = (1 - r - k) / (1 - k) || 0;
	m = (1 - g - k) / (1 - k) || 0;
	y = (1 - b - k) / (1 - k) || 0;

	return [c * 100, m * 100, y * 100, k * 100];
};

/**
 * See https://en.m.wikipedia.org/wiki/Euclidean_distance#Squared_Euclidean_distance
 * */
function comparativeDistance(x, y) {
	return (
		Math.pow(x[0] - y[0], 2) +
		Math.pow(x[1] - y[1], 2) +
		Math.pow(x[2] - y[2], 2)
	);
}

convert.rgb.keyword = function (rgb) {
	var reversed = reverseKeywords[rgb];
	if (reversed) {
		return reversed;
	}

	var currentClosestDistance = Infinity;
	var currentClosestKeyword;

	for (var keyword in cssKeywords) {
		if (cssKeywords.hasOwnProperty(keyword)) {
			var value = cssKeywords[keyword];

			// Compute comparative distance
			var distance = comparativeDistance(rgb, value);

			// Check if its less, if so set as closest
			if (distance < currentClosestDistance) {
				currentClosestDistance = distance;
				currentClosestKeyword = keyword;
			}
		}
	}

	return currentClosestKeyword;
};

convert.keyword.rgb = function (keyword) {
	return cssKeywords[keyword];
};

convert.rgb.xyz = function (rgb) {
	var r = rgb[0] / 255;
	var g = rgb[1] / 255;
	var b = rgb[2] / 255;

	// assume sRGB
	r = r > 0.04045 ? Math.pow(((r + 0.055) / 1.055), 2.4) : (r / 12.92);
	g = g > 0.04045 ? Math.pow(((g + 0.055) / 1.055), 2.4) : (g / 12.92);
	b = b > 0.04045 ? Math.pow(((b + 0.055) / 1.055), 2.4) : (b / 12.92);

	var x = (r * 0.4124) + (g * 0.3576) + (b * 0.1805);
	var y = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
	var z = (r * 0.0193) + (g * 0.1192) + (b * 0.9505);

	return [x * 100, y * 100, z * 100];
};

convert.rgb.lab = function (rgb) {
	var xyz = convert.rgb.xyz(rgb);
	var x = xyz[0];
	var y = xyz[1];
	var z = xyz[2];
	var l;
	var a;
	var b;

	x /= 95.047;
	y /= 100;
	z /= 108.883;

	x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + (16 / 116);
	y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + (16 / 116);
	z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + (16 / 116);

	l = (116 * y) - 16;
	a = 500 * (x - y);
	b = 200 * (y - z);

	return [l, a, b];
};

convert.hsl.rgb = function (hsl) {
	var h = hsl[0] / 360;
	var s = hsl[1] / 100;
	var l = hsl[2] / 100;
	var t1;
	var t2;
	var t3;
	var rgb;
	var val;

	if (s === 0) {
		val = l * 255;
		return [val, val, val];
	}

	if (l < 0.5) {
		t2 = l * (1 + s);
	} else {
		t2 = l + s - l * s;
	}

	t1 = 2 * l - t2;

	rgb = [0, 0, 0];
	for (var i = 0; i < 3; i++) {
		t3 = h + 1 / 3 * -(i - 1);
		if (t3 < 0) {
			t3++;
		}
		if (t3 > 1) {
			t3--;
		}

		if (6 * t3 < 1) {
			val = t1 + (t2 - t1) * 6 * t3;
		} else if (2 * t3 < 1) {
			val = t2;
		} else if (3 * t3 < 2) {
			val = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
		} else {
			val = t1;
		}

		rgb[i] = val * 255;
	}

	return rgb;
};

convert.hsl.hsv = function (hsl) {
	var h = hsl[0];
	var s = hsl[1] / 100;
	var l = hsl[2] / 100;
	var smin = s;
	var lmin = Math.max(l, 0.01);
	var sv;
	var v;

	l *= 2;
	s *= (l <= 1) ? l : 2 - l;
	smin *= lmin <= 1 ? lmin : 2 - lmin;
	v = (l + s) / 2;
	sv = l === 0 ? (2 * smin) / (lmin + smin) : (2 * s) / (l + s);

	return [h, sv * 100, v * 100];
};

convert.hsv.rgb = function (hsv) {
	var h = hsv[0] / 60;
	var s = hsv[1] / 100;
	var v = hsv[2] / 100;
	var hi = Math.floor(h) % 6;

	var f = h - Math.floor(h);
	var p = 255 * v * (1 - s);
	var q = 255 * v * (1 - (s * f));
	var t = 255 * v * (1 - (s * (1 - f)));
	v *= 255;

	switch (hi) {
		case 0:
			return [v, t, p];
		case 1:
			return [q, v, p];
		case 2:
			return [p, v, t];
		case 3:
			return [p, q, v];
		case 4:
			return [t, p, v];
		case 5:
			return [v, p, q];
	}
};

convert.hsv.hsl = function (hsv) {
	var h = hsv[0];
	var s = hsv[1] / 100;
	var v = hsv[2] / 100;
	var vmin = Math.max(v, 0.01);
	var lmin;
	var sl;
	var l;

	l = (2 - s) * v;
	lmin = (2 - s) * vmin;
	sl = s * vmin;
	sl /= (lmin <= 1) ? lmin : 2 - lmin;
	sl = sl || 0;
	l /= 2;

	return [h, sl * 100, l * 100];
};

// http://dev.w3.org/csswg/css-color/#hwb-to-rgb
convert.hwb.rgb = function (hwb) {
	var h = hwb[0] / 360;
	var wh = hwb[1] / 100;
	var bl = hwb[2] / 100;
	var ratio = wh + bl;
	var i;
	var v;
	var f;
	var n;

	// wh + bl cant be > 1
	if (ratio > 1) {
		wh /= ratio;
		bl /= ratio;
	}

	i = Math.floor(6 * h);
	v = 1 - bl;
	f = 6 * h - i;

	if ((i & 0x01) !== 0) {
		f = 1 - f;
	}

	n = wh + f * (v - wh); // linear interpolation

	var r;
	var g;
	var b;
	switch (i) {
		default:
		case 6:
		case 0: r = v; g = n; b = wh; break;
		case 1: r = n; g = v; b = wh; break;
		case 2: r = wh; g = v; b = n; break;
		case 3: r = wh; g = n; b = v; break;
		case 4: r = n; g = wh; b = v; break;
		case 5: r = v; g = wh; b = n; break;
	}

	return [r * 255, g * 255, b * 255];
};

convert.cmyk.rgb = function (cmyk) {
	var c = cmyk[0] / 100;
	var m = cmyk[1] / 100;
	var y = cmyk[2] / 100;
	var k = cmyk[3] / 100;
	var r;
	var g;
	var b;

	r = 1 - Math.min(1, c * (1 - k) + k);
	g = 1 - Math.min(1, m * (1 - k) + k);
	b = 1 - Math.min(1, y * (1 - k) + k);

	return [r * 255, g * 255, b * 255];
};

convert.xyz.rgb = function (xyz) {
	var x = xyz[0] / 100;
	var y = xyz[1] / 100;
	var z = xyz[2] / 100;
	var r;
	var g;
	var b;

	r = (x * 3.2406) + (y * -1.5372) + (z * -0.4986);
	g = (x * -0.9689) + (y * 1.8758) + (z * 0.0415);
	b = (x * 0.0557) + (y * -0.2040) + (z * 1.0570);

	// assume sRGB
	r = r > 0.0031308
		? ((1.055 * Math.pow(r, 1.0 / 2.4)) - 0.055)
		: r * 12.92;

	g = g > 0.0031308
		? ((1.055 * Math.pow(g, 1.0 / 2.4)) - 0.055)
		: g * 12.92;

	b = b > 0.0031308
		? ((1.055 * Math.pow(b, 1.0 / 2.4)) - 0.055)
		: b * 12.92;

	r = Math.min(Math.max(0, r), 1);
	g = Math.min(Math.max(0, g), 1);
	b = Math.min(Math.max(0, b), 1);

	return [r * 255, g * 255, b * 255];
};

convert.xyz.lab = function (xyz) {
	var x = xyz[0];
	var y = xyz[1];
	var z = xyz[2];
	var l;
	var a;
	var b;

	x /= 95.047;
	y /= 100;
	z /= 108.883;

	x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + (16 / 116);
	y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + (16 / 116);
	z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + (16 / 116);

	l = (116 * y) - 16;
	a = 500 * (x - y);
	b = 200 * (y - z);

	return [l, a, b];
};

convert.lab.xyz = function (lab) {
	var l = lab[0];
	var a = lab[1];
	var b = lab[2];
	var x;
	var y;
	var z;

	y = (l + 16) / 116;
	x = a / 500 + y;
	z = y - b / 200;

	var y2 = Math.pow(y, 3);
	var x2 = Math.pow(x, 3);
	var z2 = Math.pow(z, 3);
	y = y2 > 0.008856 ? y2 : (y - 16 / 116) / 7.787;
	x = x2 > 0.008856 ? x2 : (x - 16 / 116) / 7.787;
	z = z2 > 0.008856 ? z2 : (z - 16 / 116) / 7.787;

	x *= 95.047;
	y *= 100;
	z *= 108.883;

	return [x, y, z];
};

convert.lab.lch = function (lab) {
	var l = lab[0];
	var a = lab[1];
	var b = lab[2];
	var hr;
	var h;
	var c;

	hr = Math.atan2(b, a);
	h = hr * 360 / 2 / Math.PI;

	if (h < 0) {
		h += 360;
	}

	c = Math.sqrt(a * a + b * b);

	return [l, c, h];
};

convert.lch.lab = function (lch) {
	var l = lch[0];
	var c = lch[1];
	var h = lch[2];
	var a;
	var b;
	var hr;

	hr = h / 360 * 2 * Math.PI;
	a = c * Math.cos(hr);
	b = c * Math.sin(hr);

	return [l, a, b];
};

convert.rgb.ansi16 = function (args) {
	var r = args[0];
	var g = args[1];
	var b = args[2];
	var value = 1 in arguments ? arguments[1] : convert.rgb.hsv(args)[2]; // hsv -> ansi16 optimization

	value = Math.round(value / 50);

	if (value === 0) {
		return 30;
	}

	var ansi = 30
		+ ((Math.round(b / 255) << 2)
		| (Math.round(g / 255) << 1)
		| Math.round(r / 255));

	if (value === 2) {
		ansi += 60;
	}

	return ansi;
};

convert.hsv.ansi16 = function (args) {
	// optimization here; we already know the value and don't need to get
	// it converted for us.
	return convert.rgb.ansi16(convert.hsv.rgb(args), args[2]);
};

convert.rgb.ansi256 = function (args) {
	var r = args[0];
	var g = args[1];
	var b = args[2];

	// we use the extended greyscale palette here, with the exception of
	// black and white. normal palette only has 4 greyscale shades.
	if (r === g && g === b) {
		if (r < 8) {
			return 16;
		}

		if (r > 248) {
			return 231;
		}

		return Math.round(((r - 8) / 247) * 24) + 232;
	}

	var ansi = 16
		+ (36 * Math.round(r / 255 * 5))
		+ (6 * Math.round(g / 255 * 5))
		+ Math.round(b / 255 * 5);

	return ansi;
};

convert.ansi16.rgb = function (args) {
	var color = args % 10;

	// handle greyscale
	if (color === 0 || color === 7) {
		if (args > 50) {
			color += 3.5;
		}

		color = color / 10.5 * 255;

		return [color, color, color];
	}

	var mult = (~~(args > 50) + 1) * 0.5;
	var r = ((color & 1) * mult) * 255;
	var g = (((color >> 1) & 1) * mult) * 255;
	var b = (((color >> 2) & 1) * mult) * 255;

	return [r, g, b];
};

convert.ansi256.rgb = function (args) {
	// handle greyscale
	if (args >= 232) {
		var c = (args - 232) * 10 + 8;
		return [c, c, c];
	}

	args -= 16;

	var rem;
	var r = Math.floor(args / 36) / 5 * 255;
	var g = Math.floor((rem = args % 36) / 6) / 5 * 255;
	var b = (rem % 6) / 5 * 255;

	return [r, g, b];
};

convert.rgb.hex = function (args) {
	var integer = ((Math.round(args[0]) & 0xFF) << 16)
		+ ((Math.round(args[1]) & 0xFF) << 8)
		+ (Math.round(args[2]) & 0xFF);

	var string = integer.toString(16).toUpperCase();
	return '000000'.substring(string.length) + string;
};

convert.hex.rgb = function (args) {
	var match = args.toString(16).match(/[a-f0-9]{6}|[a-f0-9]{3}/i);
	if (!match) {
		return [0, 0, 0];
	}

	var colorString = match[0];

	if (match[0].length === 3) {
		colorString = colorString.split('').map(function (char) {
			return char + char;
		}).join('');
	}

	var integer = parseInt(colorString, 16);
	var r = (integer >> 16) & 0xFF;
	var g = (integer >> 8) & 0xFF;
	var b = integer & 0xFF;

	return [r, g, b];
};

convert.rgb.hcg = function (rgb) {
	var r = rgb[0] / 255;
	var g = rgb[1] / 255;
	var b = rgb[2] / 255;
	var max = Math.max(Math.max(r, g), b);
	var min = Math.min(Math.min(r, g), b);
	var chroma = (max - min);
	var grayscale;
	var hue;

	if (chroma < 1) {
		grayscale = min / (1 - chroma);
	} else {
		grayscale = 0;
	}

	if (chroma <= 0) {
		hue = 0;
	} else
	if (max === r) {
		hue = ((g - b) / chroma) % 6;
	} else
	if (max === g) {
		hue = 2 + (b - r) / chroma;
	} else {
		hue = 4 + (r - g) / chroma + 4;
	}

	hue /= 6;
	hue %= 1;

	return [hue * 360, chroma * 100, grayscale * 100];
};

convert.hsl.hcg = function (hsl) {
	var s = hsl[1] / 100;
	var l = hsl[2] / 100;
	var c = 1;
	var f = 0;

	if (l < 0.5) {
		c = 2.0 * s * l;
	} else {
		c = 2.0 * s * (1.0 - l);
	}

	if (c < 1.0) {
		f = (l - 0.5 * c) / (1.0 - c);
	}

	return [hsl[0], c * 100, f * 100];
};

convert.hsv.hcg = function (hsv) {
	var s = hsv[1] / 100;
	var v = hsv[2] / 100;

	var c = s * v;
	var f = 0;

	if (c < 1.0) {
		f = (v - c) / (1 - c);
	}

	return [hsv[0], c * 100, f * 100];
};

convert.hcg.rgb = function (hcg) {
	var h = hcg[0] / 360;
	var c = hcg[1] / 100;
	var g = hcg[2] / 100;

	if (c === 0.0) {
		return [g * 255, g * 255, g * 255];
	}

	var pure = [0, 0, 0];
	var hi = (h % 1) * 6;
	var v = hi % 1;
	var w = 1 - v;
	var mg = 0;

	switch (Math.floor(hi)) {
		case 0:
			pure[0] = 1; pure[1] = v; pure[2] = 0; break;
		case 1:
			pure[0] = w; pure[1] = 1; pure[2] = 0; break;
		case 2:
			pure[0] = 0; pure[1] = 1; pure[2] = v; break;
		case 3:
			pure[0] = 0; pure[1] = w; pure[2] = 1; break;
		case 4:
			pure[0] = v; pure[1] = 0; pure[2] = 1; break;
		default:
			pure[0] = 1; pure[1] = 0; pure[2] = w;
	}

	mg = (1.0 - c) * g;

	return [
		(c * pure[0] + mg) * 255,
		(c * pure[1] + mg) * 255,
		(c * pure[2] + mg) * 255
	];
};

convert.hcg.hsv = function (hcg) {
	var c = hcg[1] / 100;
	var g = hcg[2] / 100;

	var v = c + g * (1.0 - c);
	var f = 0;

	if (v > 0.0) {
		f = c / v;
	}

	return [hcg[0], f * 100, v * 100];
};

convert.hcg.hsl = function (hcg) {
	var c = hcg[1] / 100;
	var g = hcg[2] / 100;

	var l = g * (1.0 - c) + 0.5 * c;
	var s = 0;

	if (l > 0.0 && l < 0.5) {
		s = c / (2 * l);
	} else
	if (l >= 0.5 && l < 1.0) {
		s = c / (2 * (1 - l));
	}

	return [hcg[0], s * 100, l * 100];
};

convert.hcg.hwb = function (hcg) {
	var c = hcg[1] / 100;
	var g = hcg[2] / 100;
	var v = c + g * (1.0 - c);
	return [hcg[0], (v - c) * 100, (1 - v) * 100];
};

convert.hwb.hcg = function (hwb) {
	var w = hwb[1] / 100;
	var b = hwb[2] / 100;
	var v = 1 - b;
	var c = v - w;
	var g = 0;

	if (c < 1) {
		g = (v - c) / (1 - c);
	}

	return [hwb[0], c * 100, g * 100];
};

convert.apple.rgb = function (apple) {
	return [(apple[0] / 65535) * 255, (apple[1] / 65535) * 255, (apple[2] / 65535) * 255];
};

convert.rgb.apple = function (rgb) {
	return [(rgb[0] / 255) * 65535, (rgb[1] / 255) * 65535, (rgb[2] / 255) * 65535];
};

convert.gray.rgb = function (args) {
	return [args[0] / 100 * 255, args[0] / 100 * 255, args[0] / 100 * 255];
};

convert.gray.hsl = convert.gray.hsv = function (args) {
	return [0, 0, args[0]];
};

convert.gray.hwb = function (gray) {
	return [0, 100, gray[0]];
};

convert.gray.cmyk = function (gray) {
	return [0, 0, 0, gray[0]];
};

convert.gray.lab = function (gray) {
	return [gray[0], 0, 0];
};

convert.gray.hex = function (gray) {
	var val = Math.round(gray[0] / 100 * 255) & 0xFF;
	var integer = (val << 16) + (val << 8) + val;

	var string = integer.toString(16).toUpperCase();
	return '000000'.substring(string.length) + string;
};

convert.rgb.gray = function (rgb) {
	var val = (rgb[0] + rgb[1] + rgb[2]) / 3;
	return [val / 255 * 100];
};

},{"color-name":4}],2:[function(require,module,exports){
var conversions = require('./conversions');
var route = require('./route');

var convert = {};

var models = Object.keys(conversions);

function wrapRaw(fn) {
	var wrappedFn = function (args) {
		if (args === undefined || args === null) {
			return args;
		}

		if (arguments.length > 1) {
			args = Array.prototype.slice.call(arguments);
		}

		return fn(args);
	};

	// preserve .conversion property if there is one
	if ('conversion' in fn) {
		wrappedFn.conversion = fn.conversion;
	}

	return wrappedFn;
}

function wrapRounded(fn) {
	var wrappedFn = function (args) {
		if (args === undefined || args === null) {
			return args;
		}

		if (arguments.length > 1) {
			args = Array.prototype.slice.call(arguments);
		}

		var result = fn(args);

		// we're assuming the result is an array here.
		// see notice in conversions.js; don't use box types
		// in conversion functions.
		if (typeof result === 'object') {
			for (var len = result.length, i = 0; i < len; i++) {
				result[i] = Math.round(result[i]);
			}
		}

		return result;
	};

	// preserve .conversion property if there is one
	if ('conversion' in fn) {
		wrappedFn.conversion = fn.conversion;
	}

	return wrappedFn;
}

models.forEach(function (fromModel) {
	convert[fromModel] = {};

	Object.defineProperty(convert[fromModel], 'channels', {value: conversions[fromModel].channels});
	Object.defineProperty(convert[fromModel], 'labels', {value: conversions[fromModel].labels});

	var routes = route(fromModel);
	var routeModels = Object.keys(routes);

	routeModels.forEach(function (toModel) {
		var fn = routes[toModel];

		convert[fromModel][toModel] = wrapRounded(fn);
		convert[fromModel][toModel].raw = wrapRaw(fn);
	});
});

module.exports = convert;

},{"./conversions":1,"./route":3}],3:[function(require,module,exports){
var conversions = require('./conversions');

/*
	this function routes a model to all other models.

	all functions that are routed have a property `.conversion` attached
	to the returned synthetic function. This property is an array
	of strings, each with the steps in between the 'from' and 'to'
	color models (inclusive).

	conversions that are not possible simply are not included.
*/

function buildGraph() {
	var graph = {};
	// https://jsperf.com/object-keys-vs-for-in-with-closure/3
	var models = Object.keys(conversions);

	for (var len = models.length, i = 0; i < len; i++) {
		graph[models[i]] = {
			// http://jsperf.com/1-vs-infinity
			// micro-opt, but this is simple.
			distance: -1,
			parent: null
		};
	}

	return graph;
}

// https://en.wikipedia.org/wiki/Breadth-first_search
function deriveBFS(fromModel) {
	var graph = buildGraph();
	var queue = [fromModel]; // unshift -> queue -> pop

	graph[fromModel].distance = 0;

	while (queue.length) {
		var current = queue.pop();
		var adjacents = Object.keys(conversions[current]);

		for (var len = adjacents.length, i = 0; i < len; i++) {
			var adjacent = adjacents[i];
			var node = graph[adjacent];

			if (node.distance === -1) {
				node.distance = graph[current].distance + 1;
				node.parent = current;
				queue.unshift(adjacent);
			}
		}
	}

	return graph;
}

function link(from, to) {
	return function (args) {
		return to(from(args));
	};
}

function wrapConversion(toModel, graph) {
	var path = [graph[toModel].parent, toModel];
	var fn = conversions[graph[toModel].parent][toModel];

	var cur = graph[toModel].parent;
	while (graph[cur].parent) {
		path.unshift(graph[cur].parent);
		fn = link(conversions[graph[cur].parent][cur], fn);
		cur = graph[cur].parent;
	}

	fn.conversion = path;
	return fn;
}

module.exports = function (fromModel) {
	var graph = deriveBFS(fromModel);
	var conversion = {};

	var models = Object.keys(graph);
	for (var len = models.length, i = 0; i < len; i++) {
		var toModel = models[i];
		var node = graph[toModel];

		if (node.parent === null) {
			// no possible conversion, or this node is the source model.
			continue;
		}

		conversion[toModel] = wrapConversion(toModel, graph);
	}

	return conversion;
};


},{"./conversions":1}],4:[function(require,module,exports){
module.exports = {
	"aliceblue": [240, 248, 255],
	"antiquewhite": [250, 235, 215],
	"aqua": [0, 255, 255],
	"aquamarine": [127, 255, 212],
	"azure": [240, 255, 255],
	"beige": [245, 245, 220],
	"bisque": [255, 228, 196],
	"black": [0, 0, 0],
	"blanchedalmond": [255, 235, 205],
	"blue": [0, 0, 255],
	"blueviolet": [138, 43, 226],
	"brown": [165, 42, 42],
	"burlywood": [222, 184, 135],
	"cadetblue": [95, 158, 160],
	"chartreuse": [127, 255, 0],
	"chocolate": [210, 105, 30],
	"coral": [255, 127, 80],
	"cornflowerblue": [100, 149, 237],
	"cornsilk": [255, 248, 220],
	"crimson": [220, 20, 60],
	"cyan": [0, 255, 255],
	"darkblue": [0, 0, 139],
	"darkcyan": [0, 139, 139],
	"darkgoldenrod": [184, 134, 11],
	"darkgray": [169, 169, 169],
	"darkgreen": [0, 100, 0],
	"darkgrey": [169, 169, 169],
	"darkkhaki": [189, 183, 107],
	"darkmagenta": [139, 0, 139],
	"darkolivegreen": [85, 107, 47],
	"darkorange": [255, 140, 0],
	"darkorchid": [153, 50, 204],
	"darkred": [139, 0, 0],
	"darksalmon": [233, 150, 122],
	"darkseagreen": [143, 188, 143],
	"darkslateblue": [72, 61, 139],
	"darkslategray": [47, 79, 79],
	"darkslategrey": [47, 79, 79],
	"darkturquoise": [0, 206, 209],
	"darkviolet": [148, 0, 211],
	"deeppink": [255, 20, 147],
	"deepskyblue": [0, 191, 255],
	"dimgray": [105, 105, 105],
	"dimgrey": [105, 105, 105],
	"dodgerblue": [30, 144, 255],
	"firebrick": [178, 34, 34],
	"floralwhite": [255, 250, 240],
	"forestgreen": [34, 139, 34],
	"fuchsia": [255, 0, 255],
	"gainsboro": [220, 220, 220],
	"ghostwhite": [248, 248, 255],
	"gold": [255, 215, 0],
	"goldenrod": [218, 165, 32],
	"gray": [128, 128, 128],
	"green": [0, 128, 0],
	"greenyellow": [173, 255, 47],
	"grey": [128, 128, 128],
	"honeydew": [240, 255, 240],
	"hotpink": [255, 105, 180],
	"indianred": [205, 92, 92],
	"indigo": [75, 0, 130],
	"ivory": [255, 255, 240],
	"khaki": [240, 230, 140],
	"lavender": [230, 230, 250],
	"lavenderblush": [255, 240, 245],
	"lawngreen": [124, 252, 0],
	"lemonchiffon": [255, 250, 205],
	"lightblue": [173, 216, 230],
	"lightcoral": [240, 128, 128],
	"lightcyan": [224, 255, 255],
	"lightgoldenrodyellow": [250, 250, 210],
	"lightgray": [211, 211, 211],
	"lightgreen": [144, 238, 144],
	"lightgrey": [211, 211, 211],
	"lightpink": [255, 182, 193],
	"lightsalmon": [255, 160, 122],
	"lightseagreen": [32, 178, 170],
	"lightskyblue": [135, 206, 250],
	"lightslategray": [119, 136, 153],
	"lightslategrey": [119, 136, 153],
	"lightsteelblue": [176, 196, 222],
	"lightyellow": [255, 255, 224],
	"lime": [0, 255, 0],
	"limegreen": [50, 205, 50],
	"linen": [250, 240, 230],
	"magenta": [255, 0, 255],
	"maroon": [128, 0, 0],
	"mediumaquamarine": [102, 205, 170],
	"mediumblue": [0, 0, 205],
	"mediumorchid": [186, 85, 211],
	"mediumpurple": [147, 112, 219],
	"mediumseagreen": [60, 179, 113],
	"mediumslateblue": [123, 104, 238],
	"mediumspringgreen": [0, 250, 154],
	"mediumturquoise": [72, 209, 204],
	"mediumvioletred": [199, 21, 133],
	"midnightblue": [25, 25, 112],
	"mintcream": [245, 255, 250],
	"mistyrose": [255, 228, 225],
	"moccasin": [255, 228, 181],
	"navajowhite": [255, 222, 173],
	"navy": [0, 0, 128],
	"oldlace": [253, 245, 230],
	"olive": [128, 128, 0],
	"olivedrab": [107, 142, 35],
	"orange": [255, 165, 0],
	"orangered": [255, 69, 0],
	"orchid": [218, 112, 214],
	"palegoldenrod": [238, 232, 170],
	"palegreen": [152, 251, 152],
	"paleturquoise": [175, 238, 238],
	"palevioletred": [219, 112, 147],
	"papayawhip": [255, 239, 213],
	"peachpuff": [255, 218, 185],
	"peru": [205, 133, 63],
	"pink": [255, 192, 203],
	"plum": [221, 160, 221],
	"powderblue": [176, 224, 230],
	"purple": [128, 0, 128],
	"rebeccapurple": [102, 51, 153],
	"red": [255, 0, 0],
	"rosybrown": [188, 143, 143],
	"royalblue": [65, 105, 225],
	"saddlebrown": [139, 69, 19],
	"salmon": [250, 128, 114],
	"sandybrown": [244, 164, 96],
	"seagreen": [46, 139, 87],
	"seashell": [255, 245, 238],
	"sienna": [160, 82, 45],
	"silver": [192, 192, 192],
	"skyblue": [135, 206, 235],
	"slateblue": [106, 90, 205],
	"slategray": [112, 128, 144],
	"slategrey": [112, 128, 144],
	"snow": [255, 250, 250],
	"springgreen": [0, 255, 127],
	"steelblue": [70, 130, 180],
	"tan": [210, 180, 140],
	"teal": [0, 128, 128],
	"thistle": [216, 191, 216],
	"tomato": [255, 99, 71],
	"turquoise": [64, 224, 208],
	"violet": [238, 130, 238],
	"wheat": [245, 222, 179],
	"white": [255, 255, 255],
	"whitesmoke": [245, 245, 245],
	"yellow": [255, 255, 0],
	"yellowgreen": [154, 205, 50]
};
},{}],5:[function(require,module,exports){
/* MIT license */
var colorNames = require('color-name');
var swizzle = require('simple-swizzle');

var reverseNames = {};

// create a list of reverse color names
for (var name in colorNames) {
	if (colorNames.hasOwnProperty(name)) {
		reverseNames[colorNames[name]] = name;
	}
}

var cs = module.exports = {
	to: {}
};

cs.get = function (string) {
	var prefix = string.substring(0, 3).toLowerCase();
	var val;
	var model;
	switch (prefix) {
		case 'hsl':
			val = cs.get.hsl(string);
			model = 'hsl';
			break;
		case 'hwb':
			val = cs.get.hwb(string);
			model = 'hwb';
			break;
		default:
			val = cs.get.rgb(string);
			model = 'rgb';
			break;
	}

	if (!val) {
		return null;
	}

	return {model: model, value: val};
};

cs.get.rgb = function (string) {
	if (!string) {
		return null;
	}

	var abbr = /^#([a-f0-9]{3,4})$/i;
	var hex = /^#([a-f0-9]{6})([a-f0-9]{2})?$/i;
	var rgba = /^rgba?\(\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/;
	var per = /^rgba?\(\s*([+-]?[\d\.]+)\%\s*,\s*([+-]?[\d\.]+)\%\s*,\s*([+-]?[\d\.]+)\%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/;
	var keyword = /(\D+)/;

	var rgb = [0, 0, 0, 1];
	var match;
	var i;
	var hexAlpha;

	if (match = string.match(hex)) {
		hexAlpha = match[2];
		match = match[1];

		for (i = 0; i < 3; i++) {
			// https://jsperf.com/slice-vs-substr-vs-substring-methods-long-string/19
			var i2 = i * 2;
			rgb[i] = parseInt(match.slice(i2, i2 + 2), 16);
		}

		if (hexAlpha) {
			rgb[3] = Math.round((parseInt(hexAlpha, 16) / 255) * 100) / 100;
		}
	} else if (match = string.match(abbr)) {
		match = match[1];
		hexAlpha = match[3];

		for (i = 0; i < 3; i++) {
			rgb[i] = parseInt(match[i] + match[i], 16);
		}

		if (hexAlpha) {
			rgb[3] = Math.round((parseInt(hexAlpha + hexAlpha, 16) / 255) * 100) / 100;
		}
	} else if (match = string.match(rgba)) {
		for (i = 0; i < 3; i++) {
			rgb[i] = parseInt(match[i + 1], 0);
		}

		if (match[4]) {
			rgb[3] = parseFloat(match[4]);
		}
	} else if (match = string.match(per)) {
		for (i = 0; i < 3; i++) {
			rgb[i] = Math.round(parseFloat(match[i + 1]) * 2.55);
		}

		if (match[4]) {
			rgb[3] = parseFloat(match[4]);
		}
	} else if (match = string.match(keyword)) {
		if (match[1] === 'transparent') {
			return [0, 0, 0, 0];
		}

		rgb = colorNames[match[1]];

		if (!rgb) {
			return null;
		}

		rgb[3] = 1;

		return rgb;
	} else {
		return null;
	}

	for (i = 0; i < 3; i++) {
		rgb[i] = clamp(rgb[i], 0, 255);
	}
	rgb[3] = clamp(rgb[3], 0, 1);

	return rgb;
};

cs.get.hsl = function (string) {
	if (!string) {
		return null;
	}

	var hsl = /^hsla?\(\s*([+-]?\d*[\.]?\d+)(?:deg)?\s*,\s*([+-]?[\d\.]+)%\s*,\s*([+-]?[\d\.]+)%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/;
	var match = string.match(hsl);

	if (match) {
		var alpha = parseFloat(match[4]);
		var h = ((parseFloat(match[1]) % 360) + 360) % 360;
		var s = clamp(parseFloat(match[2]), 0, 100);
		var l = clamp(parseFloat(match[3]), 0, 100);
		var a = clamp(isNaN(alpha) ? 1 : alpha, 0, 1);

		return [h, s, l, a];
	}

	return null;
};

cs.get.hwb = function (string) {
	if (!string) {
		return null;
	}

	var hwb = /^hwb\(\s*([+-]?\d*[\.]?\d+)(?:deg)?\s*,\s*([+-]?[\d\.]+)%\s*,\s*([+-]?[\d\.]+)%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/;
	var match = string.match(hwb);

	if (match) {
		var alpha = parseFloat(match[4]);
		var h = ((parseFloat(match[1]) % 360) + 360) % 360;
		var w = clamp(parseFloat(match[2]), 0, 100);
		var b = clamp(parseFloat(match[3]), 0, 100);
		var a = clamp(isNaN(alpha) ? 1 : alpha, 0, 1);
		return [h, w, b, a];
	}

	return null;
};

cs.to.hex = function () {
	var rgba = swizzle(arguments);

	return (
		'#' +
		hexDouble(rgba[0]) +
		hexDouble(rgba[1]) +
		hexDouble(rgba[2]) +
		(rgba[3] < 1
			? (hexDouble(Math.round(rgba[3] * 255)))
			: '')
	);
};

cs.to.rgb = function () {
	var rgba = swizzle(arguments);

	return rgba.length < 4 || rgba[3] === 1
		? 'rgb(' + Math.round(rgba[0]) + ', ' + Math.round(rgba[1]) + ', ' + Math.round(rgba[2]) + ')'
		: 'rgba(' + Math.round(rgba[0]) + ', ' + Math.round(rgba[1]) + ', ' + Math.round(rgba[2]) + ', ' + rgba[3] + ')';
};

cs.to.rgb.percent = function () {
	var rgba = swizzle(arguments);

	var r = Math.round(rgba[0] / 255 * 100);
	var g = Math.round(rgba[1] / 255 * 100);
	var b = Math.round(rgba[2] / 255 * 100);

	return rgba.length < 4 || rgba[3] === 1
		? 'rgb(' + r + '%, ' + g + '%, ' + b + '%)'
		: 'rgba(' + r + '%, ' + g + '%, ' + b + '%, ' + rgba[3] + ')';
};

cs.to.hsl = function () {
	var hsla = swizzle(arguments);
	return hsla.length < 4 || hsla[3] === 1
		? 'hsl(' + hsla[0] + ', ' + hsla[1] + '%, ' + hsla[2] + '%)'
		: 'hsla(' + hsla[0] + ', ' + hsla[1] + '%, ' + hsla[2] + '%, ' + hsla[3] + ')';
};

// hwb is a bit different than rgb(a) & hsl(a) since there is no alpha specific syntax
// (hwb have alpha optional & 1 is default value)
cs.to.hwb = function () {
	var hwba = swizzle(arguments);

	var a = '';
	if (hwba.length >= 4 && hwba[3] !== 1) {
		a = ', ' + hwba[3];
	}

	return 'hwb(' + hwba[0] + ', ' + hwba[1] + '%, ' + hwba[2] + '%' + a + ')';
};

cs.to.keyword = function (rgb) {
	return reverseNames[rgb.slice(0, 3)];
};

// helpers
function clamp(num, min, max) {
	return Math.min(Math.max(min, num), max);
}

function hexDouble(num) {
	var str = num.toString(16).toUpperCase();
	return (str.length < 2) ? '0' + str : str;
}

},{"color-name":4,"simple-swizzle":8}],6:[function(require,module,exports){
'use strict';

var colorString = require('color-string');
var convert = require('color-convert');

var _slice = [].slice;

var skippedModels = [
	// to be honest, I don't really feel like keyword belongs in color convert, but eh.
	'keyword',

	// gray conflicts with some method names, and has its own method defined.
	'gray',

	// shouldn't really be in color-convert either...
	'hex'
];

var hashedModelKeys = {};
Object.keys(convert).forEach(function (model) {
	hashedModelKeys[_slice.call(convert[model].labels).sort().join('')] = model;
});

var limiters = {};

function Color(obj, model) {
	if (!(this instanceof Color)) {
		return new Color(obj, model);
	}

	if (model && model in skippedModels) {
		model = null;
	}

	if (model && !(model in convert)) {
		throw new Error('Unknown model: ' + model);
	}

	var i;
	var channels;

	if (!obj) {
		this.model = 'rgb';
		this.color = [0, 0, 0];
		this.valpha = 1;
	} else if (obj instanceof Color) {
		this.model = obj.model;
		this.color = obj.color.slice();
		this.valpha = obj.valpha;
	} else if (typeof obj === 'string') {
		var result = colorString.get(obj);
		if (result === null) {
			throw new Error('Unable to parse color from string: ' + obj);
		}

		this.model = result.model;
		channels = convert[this.model].channels;
		this.color = result.value.slice(0, channels);
		this.valpha = typeof result.value[channels] === 'number' ? result.value[channels] : 1;
	} else if (obj.length) {
		this.model = model || 'rgb';
		channels = convert[this.model].channels;
		var newArr = _slice.call(obj, 0, channels);
		this.color = zeroArray(newArr, channels);
		this.valpha = typeof obj[channels] === 'number' ? obj[channels] : 1;
	} else if (typeof obj === 'number') {
		// this is always RGB - can be converted later on.
		obj &= 0xFFFFFF;
		this.model = 'rgb';
		this.color = [
			(obj >> 16) & 0xFF,
			(obj >> 8) & 0xFF,
			obj & 0xFF
		];
		this.valpha = 1;
	} else {
		this.valpha = 1;

		var keys = Object.keys(obj);
		if ('alpha' in obj) {
			keys.splice(keys.indexOf('alpha'), 1);
			this.valpha = typeof obj.alpha === 'number' ? obj.alpha : 0;
		}

		var hashedKeys = keys.sort().join('');
		if (!(hashedKeys in hashedModelKeys)) {
			throw new Error('Unable to parse color from object: ' + JSON.stringify(obj));
		}

		this.model = hashedModelKeys[hashedKeys];

		var labels = convert[this.model].labels;
		var color = [];
		for (i = 0; i < labels.length; i++) {
			color.push(obj[labels[i]]);
		}

		this.color = zeroArray(color);
	}

	// perform limitations (clamping, etc.)
	if (limiters[this.model]) {
		channels = convert[this.model].channels;
		for (i = 0; i < channels; i++) {
			var limit = limiters[this.model][i];
			if (limit) {
				this.color[i] = limit(this.color[i]);
			}
		}
	}

	this.valpha = Math.max(0, Math.min(1, this.valpha));

	if (Object.freeze) {
		Object.freeze(this);
	}
}

Color.prototype = {
	toString: function () {
		return this.string();
	},

	toJSON: function () {
		return this[this.model]();
	},

	string: function (places) {
		var self = this.model in colorString.to ? this : this.rgb();
		self = self.round(typeof places === 'number' ? places : 1);
		var args = self.valpha === 1 ? self.color : self.color.concat(this.valpha);
		return colorString.to[self.model](args);
	},

	percentString: function (places) {
		var self = this.rgb().round(typeof places === 'number' ? places : 1);
		var args = self.valpha === 1 ? self.color : self.color.concat(this.valpha);
		return colorString.to.rgb.percent(args);
	},

	array: function () {
		return this.valpha === 1 ? this.color.slice() : this.color.concat(this.valpha);
	},

	object: function () {
		var result = {};
		var channels = convert[this.model].channels;
		var labels = convert[this.model].labels;

		for (var i = 0; i < channels; i++) {
			result[labels[i]] = this.color[i];
		}

		if (this.valpha !== 1) {
			result.alpha = this.valpha;
		}

		return result;
	},

	unitArray: function () {
		var rgb = this.rgb().color;
		rgb[0] /= 255;
		rgb[1] /= 255;
		rgb[2] /= 255;

		if (this.valpha !== 1) {
			rgb.push(this.valpha);
		}

		return rgb;
	},

	unitObject: function () {
		var rgb = this.rgb().object();
		rgb.r /= 255;
		rgb.g /= 255;
		rgb.b /= 255;

		if (this.valpha !== 1) {
			rgb.alpha = this.valpha;
		}

		return rgb;
	},

	round: function (places) {
		places = Math.max(places || 0, 0);
		return new Color(this.color.map(roundToPlace(places)).concat(this.valpha), this.model);
	},

	alpha: function (val) {
		if (arguments.length) {
			return new Color(this.color.concat(Math.max(0, Math.min(1, val))), this.model);
		}

		return this.valpha;
	},

	// rgb
	red: getset('rgb', 0, maxfn(255)),
	green: getset('rgb', 1, maxfn(255)),
	blue: getset('rgb', 2, maxfn(255)),

	hue: getset(['hsl', 'hsv', 'hsl', 'hwb', 'hcg'], 0, function (val) { return ((val % 360) + 360) % 360; }), // eslint-disable-line brace-style

	saturationl: getset('hsl', 1, maxfn(100)),
	lightness: getset('hsl', 2, maxfn(100)),

	saturationv: getset('hsv', 1, maxfn(100)),
	value: getset('hsv', 2, maxfn(100)),

	chroma: getset('hcg', 1, maxfn(100)),
	gray: getset('hcg', 2, maxfn(100)),

	white: getset('hwb', 1, maxfn(100)),
	wblack: getset('hwb', 2, maxfn(100)),

	cyan: getset('cmyk', 0, maxfn(100)),
	magenta: getset('cmyk', 1, maxfn(100)),
	yellow: getset('cmyk', 2, maxfn(100)),
	black: getset('cmyk', 3, maxfn(100)),

	x: getset('xyz', 0, maxfn(100)),
	y: getset('xyz', 1, maxfn(100)),
	z: getset('xyz', 2, maxfn(100)),

	l: getset('lab', 0, maxfn(100)),
	a: getset('lab', 1),
	b: getset('lab', 2),

	keyword: function (val) {
		if (arguments.length) {
			return new Color(val);
		}

		return convert[this.model].keyword(this.color);
	},

	hex: function (val) {
		if (arguments.length) {
			return new Color(val);
		}

		return colorString.to.hex(this.rgb().round().color);
	},

	rgbNumber: function () {
		var rgb = this.rgb().color;
		return ((rgb[0] & 0xFF) << 16) | ((rgb[1] & 0xFF) << 8) | (rgb[2] & 0xFF);
	},

	luminosity: function () {
		// http://www.w3.org/TR/WCAG20/#relativeluminancedef
		var rgb = this.rgb().color;

		var lum = [];
		for (var i = 0; i < rgb.length; i++) {
			var chan = rgb[i] / 255;
			lum[i] = (chan <= 0.03928) ? chan / 12.92 : Math.pow(((chan + 0.055) / 1.055), 2.4);
		}

		return 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
	},

	contrast: function (color2) {
		// http://www.w3.org/TR/WCAG20/#contrast-ratiodef
		var lum1 = this.luminosity();
		var lum2 = color2.luminosity();

		if (lum1 > lum2) {
			return (lum1 + 0.05) / (lum2 + 0.05);
		}

		return (lum2 + 0.05) / (lum1 + 0.05);
	},

	level: function (color2) {
		var contrastRatio = this.contrast(color2);
		if (contrastRatio >= 7.1) {
			return 'AAA';
		}

		return (contrastRatio >= 4.5) ? 'AA' : '';
	},

	isDark: function () {
		// YIQ equation from http://24ways.org/2010/calculating-color-contrast
		var rgb = this.rgb().color;
		var yiq = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
		return yiq < 128;
	},

	isLight: function () {
		return !this.isDark();
	},

	negate: function () {
		var rgb = this.rgb();
		for (var i = 0; i < 3; i++) {
			rgb.color[i] = 255 - rgb.color[i];
		}
		return rgb;
	},

	lighten: function (ratio) {
		var hsl = this.hsl();
		hsl.color[2] += hsl.color[2] * ratio;
		return hsl;
	},

	darken: function (ratio) {
		var hsl = this.hsl();
		hsl.color[2] -= hsl.color[2] * ratio;
		return hsl;
	},

	saturate: function (ratio) {
		var hsl = this.hsl();
		hsl.color[1] += hsl.color[1] * ratio;
		return hsl;
	},

	desaturate: function (ratio) {
		var hsl = this.hsl();
		hsl.color[1] -= hsl.color[1] * ratio;
		return hsl;
	},

	whiten: function (ratio) {
		var hwb = this.hwb();
		hwb.color[1] += hwb.color[1] * ratio;
		return hwb;
	},

	blacken: function (ratio) {
		var hwb = this.hwb();
		hwb.color[2] += hwb.color[2] * ratio;
		return hwb;
	},

	grayscale: function () {
		// http://en.wikipedia.org/wiki/Grayscale#Converting_color_to_grayscale
		var rgb = this.rgb().color;
		var val = rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11;
		return Color.rgb(val, val, val);
	},

	fade: function (ratio) {
		return this.alpha(this.valpha - (this.valpha * ratio));
	},

	opaquer: function (ratio) {
		return this.alpha(this.valpha + (this.valpha * ratio));
	},

	rotate: function (degrees) {
		var hsl = this.hsl();
		var hue = hsl.color[0];
		hue = (hue + degrees) % 360;
		hue = hue < 0 ? 360 + hue : hue;
		hsl.color[0] = hue;
		return hsl;
	},

	mix: function (mixinColor, weight) {
		// ported from sass implementation in C
		// https://github.com/sass/libsass/blob/0e6b4a2850092356aa3ece07c6b249f0221caced/functions.cpp#L209
		var color1 = mixinColor.rgb();
		var color2 = this.rgb();
		var p = weight === undefined ? 0.5 : weight;

		var w = 2 * p - 1;
		var a = color1.alpha() - color2.alpha();

		var w1 = (((w * a === -1) ? w : (w + a) / (1 + w * a)) + 1) / 2.0;
		var w2 = 1 - w1;

		return Color.rgb(
				w1 * color1.red() + w2 * color2.red(),
				w1 * color1.green() + w2 * color2.green(),
				w1 * color1.blue() + w2 * color2.blue(),
				color1.alpha() * p + color2.alpha() * (1 - p));
	}
};

// model conversion methods and static constructors
Object.keys(convert).forEach(function (model) {
	if (skippedModels.indexOf(model) !== -1) {
		return;
	}

	var channels = convert[model].channels;

	// conversion methods
	Color.prototype[model] = function () {
		if (this.model === model) {
			return new Color(this);
		}

		if (arguments.length) {
			return new Color(arguments, model);
		}

		var newAlpha = typeof arguments[channels] === 'number' ? channels : this.valpha;
		return new Color(assertArray(convert[this.model][model].raw(this.color)).concat(newAlpha), model);
	};

	// 'static' construction methods
	Color[model] = function (color) {
		if (typeof color === 'number') {
			color = zeroArray(_slice.call(arguments), channels);
		}
		return new Color(color, model);
	};
});

function roundTo(num, places) {
	return Number(num.toFixed(places));
}

function roundToPlace(places) {
	return function (num) {
		return roundTo(num, places);
	};
}

function getset(model, channel, modifier) {
	model = Array.isArray(model) ? model : [model];

	model.forEach(function (m) {
		(limiters[m] || (limiters[m] = []))[channel] = modifier;
	});

	model = model[0];

	return function (val) {
		var result;

		if (arguments.length) {
			if (modifier) {
				val = modifier(val);
			}

			result = this[model]();
			result.color[channel] = val;
			return result;
		}

		result = this[model]().color[channel];
		if (modifier) {
			result = modifier(result);
		}

		return result;
	};
}

function maxfn(max) {
	return function (v) {
		return Math.max(0, Math.min(max, v));
	};
}

function assertArray(val) {
	return Array.isArray(val) ? val : [val];
}

function zeroArray(arr, length) {
	for (var i = 0; i < length; i++) {
		if (typeof arr[i] !== 'number') {
			arr[i] = 0;
		}
	}

	return arr;
}

module.exports = Color;

},{"color-convert":2,"color-string":5}],7:[function(require,module,exports){
'use strict';

module.exports = function isArrayish(obj) {
	if (!obj || typeof obj === 'string') {
		return false;
	}

	return obj instanceof Array || Array.isArray(obj) ||
		(obj.length >= 0 && (obj.splice instanceof Function ||
			(Object.getOwnPropertyDescriptor(obj, (obj.length - 1)) && obj.constructor.name !== 'String')));
};

},{}],8:[function(require,module,exports){
'use strict';

var isArrayish = require('is-arrayish');

var concat = Array.prototype.concat;
var slice = Array.prototype.slice;

var swizzle = module.exports = function swizzle(args) {
	var results = [];

	for (var i = 0, len = args.length; i < len; i++) {
		var arg = args[i];

		if (isArrayish(arg)) {
			// http://jsperf.com/javascript-array-concat-vs-push/98
			results = concat.call(results, slice.call(arg));
		} else {
			results.push(arg);
		}
	}

	return results;
};

swizzle.wrap = function (fn) {
	return function () {
		return fn(swizzle(arguments));
	};
};

},{"is-arrayish":7}],9:[function(require,module,exports){
/**
 * For handling of the actual board
 */

const tiles = require('./tiles');

exports.traverse = function(x, y, board) {
    let visited = {};
    
    let toExplore = [{x, y}];
    let depth = 1;
    while (toExplore.length > 0) {
        let exploreNext = [];
        
        for (let xy of toExplore) {
            if (visited[[xy.x, xy.y]]) continue;
            if (xy.x < 0 || xy.y < 0 || xy.x >= board.width || xy.y >= board.height) continue;
            visited[[xy.x, xy.y]] = depth;
            let tile = board.get(xy.x, xy.y);
            
            for (let newXY of tile.properties.range) {
                let newX = newXY[0], newY = newXY[1];
                let newTile = board.get(newX, newY);
                let newCoord = {x: newX, y: newY};
                
                if (tile && !visited[newCoord]) {
                    exploreNext.push(newCoord);
                }
            }
        }
        
        depth++;
        toExplore = exploreNext;
    }
    
    return visited;
};

exports.create = (width, height, first, second) => ({
    width,
    height,
    first, second,
    data: (function() {
        let result = {};
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                result[[x, y]] = tiles.blank({ x, y });
            }
        }
        return result;
    })(),
    update: function() {
        let firstMap = exports.traverse(this.first.x, this.first.y, this);
        let secondMap = exports.traverse(this.second.x, this.second.y, this);
        let firstWins = false;
        let secondWins = false;
        
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                let owners = [];
                let xy = [x, y];
                if (firstMap[xy]) owners.push(1);
                if (secondMap[xy]) owners.push(2);
                if (tile.type == 'base') {
                    if (owners.length == 2) {
                        if (tile.owners[0] == 1) secondWins = true;
                        if (tile.owners[0] == 2) firstWins = true;
                    }
                }
                
                let tile = this.get(x, y);
                tile.owners = owners;
            }
        }
        
        return {
            firstWins,
            secondWins
        };
    },
    get: function(x, y) {
        return this.data[[x,y]];
    },
    set: function(x, y, tile, force) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            throw `Error: ${x}, ${y} not within range of board width and height`;
        }
        if (force) {
            tile.properties.x = x;
            tile.properties.y = y;
            this.data[[x, y]] = tile;
        }
        else {
            let dest = this.get(x, y);
            if (tile.canPlaceOn(dest)) {
                let newTile = tile.whenPlacedOn(dest);
                newTile.properties.x = x;
                newTile.properties.y = y;
                
                if (dest.type == 'mine') {
                    newTile = tiles.collision({ x, y });
                }
                this.data[[x, y]] = newTile;
            }
            else {
                throw `Error: Cannot place ${tile.type} on ${dest.type}`;
            }
        }
    }
});
},{"./tiles":13}],10:[function(require,module,exports){
/**
 * For the web viewer
 */

exports.computeSvgHeader = (width, height) => `<svg version="1.2" baseProfile="tiny" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:a="http://ns.adobe.com/AdobeSVGViewerExtensions/3.0/" x="0px" y="0px" width="${width}" height="${height}" viewBox="0 0 80 80" xml:space="preserve">`;

exports.svgFooter = `</svg>`;

exports.star = `<defs></defs><polygon class="shape" points="62.5,45 62.499,34.999 52.071,35 59.445,27.625 52.374,20.555 44.999,27.93 44.999,17.5 35,17.5 35,27.929 27.625,20.555 20.555,27.625 27.928,35 17.5,35 17.5,45 27.929,45 20.555,52.374 27.625,59.445 35,52.072 34.999,62.499 45,62.5 44.999,52.07 52.374,59.445 59.445,52.374 52.071,45 "></polygon><path class="border" d="M80,80H0V0h80V80L80,80z M2.5,77.5h75v-75h-75V77.5L2.5,77.5z"></path><rect class="border2" x="2.5" y="2.5" fill="none" stroke-width="1.5" width="75" height="75"></rect>`

exports.plus = `<defs></defs><polygon class="shape" points="62.5,35 45,35 45,17.5 35,17.5 35,35 17.5,35 17.5,45 35,45 35,62.5 45,62.5 45,45 62.5,45 "></polygon><path class="border" d="M80,80H0V0h80V80L80,80z M2.5,77.5h75v-75h-75V77.5L2.5,77.5z"></path><rect class="border2" x="2.5" y="2.5" fill="none" stroke-width="1.5" width="75" height="75"></rect>`;

exports.x = `<defs></defs><polygon class="shape" points="59.445,52.374 47.071,40 59.445,27.625 52.374,20.555 40,32.929 27.625,20.555 20.555,27.625 32.929,40 20.555,52.374 27.625,59.445 40,47.071 52.374,59.445 "></polygon><path class="border" d="M80,80H0V0h80V80L80,80z M2.5,77.5h75v-75h-75V77.5L2.5,77.5z"></path><rect class="border2" x="2.5" y="2.5" fill="none" stroke-width="1.5" width="75" height="75"></rect>`;

exports.left = `<defs></defs><polygon class="shape" points="15.139,40 36,53.563 35,45 62.5,45 62.5,35 35,35 36,26.438 "></polygon><path class="border" d="M80,80H0V0h80V80L80,80z M2.5,77.5h75v-75h-75V77.5L2.5,77.5z"></path><rect class="border2" x="2.5" y="2.5" fill="none" stroke-width="1.5" width="75" height="75"></rect>`;

exports.right = `<defs></defs><polygon class="shape" points="64.861,40 44,26.438 45,35 17.5,35 17.5,45 45,45 44,53.563 "></polygon><path class="border" d="M80,80H0V0h80V80L80,80z M2.5,77.5h75v-75h-75V77.5L2.5,77.5z"></path><rect class="border2" x="2.5" y="2.5" fill="none" stroke-width="1.5" width="75" height="75"></rect>`;

exports.upLeft = `<defs></defs><polygon class="shape" points="22.42,22.42 27.582,46.762 32.929,40 52.374,59.445 59.445,52.374 40,32.929 46.762,27.582 "></polygon><path class="border" d="M80,80H0V0h80V80L80,80z M2.5,77.5h75v-75h-75V77.5L2.5,77.5z"></path><rect class="border2" x="2.5" y="2.5" fill="none" stroke-width="1.5" width="75" height="75"></rect>`;

exports.upRight = `<defs></defs><polygon class="shape" points="57.58,22.42 33.238,27.581 40,32.929 20.555,52.374 27.626,59.445 47.071,40 52.419,46.762 "></polygon><path class="border" d="M80,80H0V0h80V80L80,80z M2.5,77.5h75v-75h-75V77.5L2.5,77.5z"></path><rect class="border2" x="2.5" y="2.5" fill="none" stroke-width="1.5" width="75" height="75"></rect>`;

exports.reclaim = `<defs></defs><polygon fill="#E3FFE1" points="13.2,21.3 15.1,27.8 21.5,29.7 15.1,31.6 13.2,38 11.3,31.6 4.8,29.7 11.3,27.8 	"></polygon>
<polygon fill="#E3FFE1" points="40.8,60 42.7,66.4 49.2,68.3 42.7,70.2 40.8,76.7 38.9,70.2 32.5,68.3 38.9,66.4 	"></polygon>
<polygon fill="#E3FFE1" points="64.5,37.2 66.3,43.6 72.8,45.5 66.3,47.4 64.5,53.8 62.6,47.4 56.1,45.5 62.6,43.6 	"></polygon>
<polygon fill="#E3FFE1" points="62.7,11.2 64.6,17.6 71,19.5 64.6,21.4 62.7,27.8 60.8,21.4 54.3,19.5 60.8,17.6 	"></polygon>
<polygon fill="#E3FFE1" points="32.5,3.8 34.4,10.3 40.8,12.2 34.4,14.1 32.5,20.5 30.6,14.1 24.1,12.2 30.6,10.3 	"></polygon>
<polygon fill="#E3FFE1" points="15.5,50.3 17.4,56.8 23.9,58.7 17.4,60.6 15.5,67 13.7,60.6 7.2,58.7 13.7,56.8 	"></polygon>
<path fill="#006616" d="M45.5,62.8l-0.4-0.6c-0.5-0.8-1.3-2.7-3.1-10.3c-1.1-5-2.6-5.8-5.7-5.9h-1.6v16.8H22.6V18.3l1-0.2
c3.5-0.6,8.3-0.9,13.1-0.9c6.9,0,11.4,1.1,14.6,3.6c2.9,2.3,4.4,5.7,4.4,9.9c0,5-2.9,8.7-6.3,10.7c2.6,2,3.7,5.2,4.4,7.6
c0.4,1.3,0.7,2.7,1.1,4c0.9,3.3,1.8,6.7,2.3,7.8l0.9,1.8H45.5z M37.2,36.5c4,0,6.4-1.8,6.4-4.9c0-3.1-2-4.6-5.9-4.7
c-1.2,0-2.2,0.1-3.1,0.1v9.4H37.2z"></path>
<path fill="#B3FFC1" d="M36.7,18.5c6.3,0,10.8,1,13.8,3.4c2.5,2,3.9,5,3.9,8.9c0,5.4-3.9,9.2-7.5,10.5v0.2c3,1.2,4.6,4.1,5.7,8
c1.3,4.8,2.7,10.4,3.5,12h-9.9c-0.7-1.2-1.7-4.7-3-9.9c-1.1-5.3-3-6.8-6.9-6.8h-2.9v16.8h-9.6V19.4C27,18.9,31.6,18.5,36.7,18.5
 M33.4,37.8h3.8c4.8,0,7.7-2.4,7.7-6.1c0-3.9-2.7-5.9-7.1-6c-2.3,0-3.7,0.2-4.4,0.3V37.8 M36.7,16c-4.8,0-9.7,0.3-13.3,0.9
l-2.1,0.3v2.1v42.1V64h2.5h9.6h2.5v-2.5V47.2h0.4c2.3,0,3.5,0.3,4.5,4.9l0,0l0,0c1.8,7.6,2.7,9.7,3.2,10.6l0.7,1.2h1.4h9.9h4
l-1.8-3.6c-0.5-1-1.4-4.5-2.2-7.5c-0.4-1.3-0.7-2.7-1.1-4.1c-0.6-2.2-1.6-5-3.6-7.2c3.1-2.3,5.5-6.1,5.5-10.9
c0-4.6-1.7-8.3-4.9-10.9C48.7,17.2,44,16,36.7,16L36.7,16z M35.9,28.2c0.6,0,1.2,0,1.9,0c4.6,0.1,4.6,2.4,4.6,3.5
c0,3.2-3.2,3.6-5.2,3.6h-1.3V28.2L35.9,28.2z"></path><path class="border" d="M80,80H0V0h80V80L80,80z M2.5,77.5h75v-75h-75V77.5L2.5,77.5z"></path><rect class="border2" x="2.5" y="2.5" fill="none" stroke-width="1.5" width="75" height="75"></rect>`;

exports.circle = `<defs></defs><circle fill="none" class="oShape" stroke="#000000" stroke-width="5" cx="40" cy="40" r="30"></circle><path class="border" d="M80,80H0V0h80V80L80,80z M2.5,77.5h75v-75h-75V77.5L2.5,77.5z"></path><rect class="border2" x="2.5" y="2.5" fill="none" stroke-width="1.5" width="75" height="75"></rect>`;

exports.up = `<defs></defs><polygon class="shape" points="40,15.139 26.438,36 35,35 35,62.5 45,62.5 45,35 53.563,36 "></polygon><path class="border" d="M80,80H0V0h80V80L80,80z M2.5,77.5h75v-75h-75V77.5L2.5,77.5z"></path><rect class="border2" x="2.5" y="2.5" fill="none" stroke-width="1.5" width="75" height="75"></rect>`;

exports.down = `<defs></defs><polygon class="shape" points="40,64.861 53.563,44 45,45 45,17.5 35,17.5 35,45 26.438,44 "></polygon><path class="border" d="M80,80H0V0h80V80L80,80z M2.5,77.5h75v-75h-75V77.5L2.5,77.5z"></path><rect class="border2" x="2.5" y="2.5" fill="none" stroke-width="1.5" width="75" height="75"></rect>`;

exports.downLeft = `<defs></defs><polygon class="shape" points="22.42,57.58 46.762,52.419 40,47.071 59.445,27.626 52.374,20.555 32.929,40 27.582,33.238 "></polygon><path class="border" d="M80,80H0V0h80V80L80,80z M2.5,77.5h75v-75h-75V77.5L2.5,77.5z"></path><rect class="border2" x="2.5" y="2.5" fill="none" stroke-width="1.5" width="75" height="75"></rect>`;

exports.downRight = `<defs></defs><polygon class="shape" points="57.58,57.58 52.419,33.238 47.071,40 27.626,20.555 20.555,27.626 40,47.071 33.238,52.419 "></polygon><path class="border" d="M80,80H0V0h80V80L80,80z M2.5,77.5h75v-75h-75V77.5L2.5,77.5z"></path><rect class="border2" x="2.5" y="2.5" fill="none" stroke-width="1.5" width="75" height="75"></rect>`;

exports.mine = `<defs></defs>
<g class="mineMetal">
    <circle cx="40" cy="40" r="4.2"></circle>
    <path d="M59.7,49.5C59.7,49.5,59.7,49.5,59.7,49.5c0.2-0.4,0.3-0.7,0.5-1.1c0,0,0-0.1,0-0.1c0.1-0.3,0.3-0.6,0.4-1
    c0-0.1,0.1-0.2,0.1-0.3c0.1-0.3,0.2-0.5,0.3-0.8c0-0.1,0.1-0.3,0.1-0.4c0.1-0.2,0.1-0.5,0.2-0.7c0-0.1,0.1-0.3,0.1-0.4
    c0.1-0.2,0.1-0.5,0.1-0.7c0-0.1,0.1-0.3,0.1-0.4c0-0.2,0.1-0.5,0.1-0.7c0-0.1,0-0.3,0.1-0.4c0-0.3,0.1-0.5,0.1-0.8
    c0-0.1,0-0.3,0-0.4c0-0.4,0-0.8,0-1.2c0-0.4,0-0.8,0-1.2c0-0.1,0-0.3,0-0.4c0-0.3,0-0.5-0.1-0.8c0-0.1,0-0.3-0.1-0.4
    c0-0.3-0.1-0.5-0.1-0.8c0-0.1,0-0.3-0.1-0.4c0-0.3-0.1-0.5-0.2-0.8c0-0.1-0.1-0.3-0.1-0.4c-0.1-0.3-0.1-0.5-0.2-0.8
    c0-0.1-0.1-0.2-0.1-0.3c-0.1-0.3-0.2-0.6-0.3-0.9c0-0.1,0-0.1-0.1-0.2c-0.3-0.7-0.6-1.5-0.9-2.2c0,0,0,0,0,0
    c-2.5-5.1-6.9-9.1-12.3-11c0,0,0,0,0,0c-0.4-0.1-0.7-0.2-1.1-0.4c-0.1,0-0.2,0-0.2-0.1c-0.3-0.1-0.6-0.2-0.9-0.2
    c-0.1,0-0.2-0.1-0.3-0.1c-0.3-0.1-0.5-0.1-0.8-0.2c-0.1,0-0.3,0-0.4-0.1c-0.3,0-0.5-0.1-0.8-0.1c-0.1,0-0.3,0-0.4-0.1
    c-0.3,0-0.6-0.1-0.8-0.1c-0.1,0-0.2,0-0.4,0c-0.4,0-0.8,0-1.2,0c-0.4,0-0.8,0-1.2,0c-0.1,0-0.3,0-0.4,0c-0.3,0-0.5,0-0.8,0.1
    c-0.1,0-0.3,0-0.4,0.1c-0.2,0-0.5,0.1-0.7,0.1c-0.1,0-0.3,0.1-0.4,0.1c-0.2,0-0.5,0.1-0.7,0.1c-0.1,0-0.3,0.1-0.4,0.1
    c-0.2,0.1-0.5,0.1-0.7,0.2c-0.1,0-0.3,0.1-0.4,0.1c-0.3,0.1-0.5,0.2-0.8,0.3c-0.1,0-0.2,0.1-0.3,0.1c-0.3,0.1-0.6,0.2-1,0.4
    c0,0-0.1,0-0.1,0c-6,2.5-10.6,7.6-12.5,13.9c0,0.1,0,0.1-0.1,0.2c-0.1,0.3-0.2,0.6-0.2,0.9c0,0.1,0,0.2-0.1,0.3
    c-0.1,0.3-0.1,0.6-0.2,0.8c0,0.1,0,0.3-0.1,0.4c0,0.3-0.1,0.5-0.1,0.8c0,0.1,0,0.3-0.1,0.4c0,0.3-0.1,0.6-0.1,0.8
    c0,0.1,0,0.2,0,0.4c0,0.4,0,0.8,0,1.2c0,0.4,0,0.8,0,1.2c0,0.1,0,0.2,0,0.4c0,0.3,0,0.6,0.1,0.8c0,0.1,0,0.3,0.1,0.4
    c0,0.3,0.1,0.5,0.1,0.8c0,0.1,0,0.3,0.1,0.4c0,0.3,0.1,0.5,0.2,0.8c0,0.1,0.1,0.2,0.1,0.3c0.1,0.3,0.1,0.6,0.2,0.9
    c0,0.1,0,0.2,0.1,0.2c0.1,0.4,0.2,0.7,0.4,1.1c0,0,0,0,0,0c1.9,5.4,5.9,9.8,11,12.3c0,0,0,0,0,0c0.7,0.3,1.4,0.7,2.2,0.9
    c0.1,0,0.1,0,0.2,0.1c0.3,0.1,0.6,0.2,0.9,0.3c0.1,0,0.2,0.1,0.3,0.1c0.3,0.1,0.5,0.1,0.8,0.2c0.1,0,0.3,0.1,0.4,0.1
    c0.3,0.1,0.5,0.1,0.8,0.2c0.1,0,0.3,0.1,0.4,0.1c0.3,0,0.5,0.1,0.8,0.1c0.1,0,0.3,0,0.4,0.1c0.3,0,0.5,0.1,0.8,0.1
    c0.1,0,0.3,0,0.4,0c0.4,0,0.8,0,1.2,0c0.4,0,0.8,0,1.2,0c0.1,0,0.2,0,0.4,0c0.3,0,0.6,0,0.8-0.1c0.1,0,0.3,0,0.4-0.1
    c0.3,0,0.5-0.1,0.8-0.1c0.1,0,0.3,0,0.4-0.1c0.3-0.1,0.6-0.1,0.8-0.2c0.1,0,0.2,0,0.3-0.1c0.3-0.1,0.6-0.2,0.9-0.2
    c0.1,0,0.1,0,0.2-0.1c1.2-0.4,2.3-0.8,3.4-1.3c0,0,0,0,0,0C54,57.4,57.5,53.9,59.7,49.5z M40,46.2c-3.4,0-6.2-2.8-6.2-6.2
    s2.8-6.2,6.2-6.2s6.2,2.8,6.2,6.2S43.4,46.2,40,46.2z"></path>
    <path fill="#1C1C1C" d="M18.9,51.1l-1,1c-1.6,1.6-1.6,4.1,0,5.7l4.4,4.4c1.6,1.6,4.1,1.6,5.7,0l1-1C24.7,58.9,21.2,55.4,18.9,51.1z "></path>';
    <path fill="#1C1C1C" d="M61.1,29l1.3-1.3c1.6-1.6,1.6-4.1,0-5.7L58,17.7c-1.6-1.6-4.1-1.6-5.7,0l-1.3,1.3 C55.4,21.2,58.9,24.7,61.1,29z"></path>';
    <path fill="#1C1C1C" d="M61.1,51c-2.2,4.3-5.7,7.8-10,10.1l1.1,1.1c1.6,1.6,4.1,1.6,5.7,0l4.4-4.4c1.6-1.6,1.6-4.1,0-5.7L61.1,51z"></path>';
    <path fill="#1C1C1C" d="M18.9,28.9c2.3-4.3,5.8-7.8,10.1-10l-1.2-1.2c-1.6-1.6-4.1-1.6-5.7,0L17.8,22c-1.6,1.6-1.6,4.1,0,5.7 L18.9,28.9z"></path>';
</g>
<circle class="mineLights" cx="30" cy="30" r="2"></circle>
<circle class="mineLights" cx="50" cy="30" r="2"></circle>
<circle class="mineLights" cx="30" cy="50" r="2"></circle>
<circle class="mineLights" cx="50" cy="50" r="2"></circle>
<path class="border" d="M80,80H0V0h80V80L80,80z M2.5,77.5h75v-75h-75V77.5L2.5,77.5z"></path><rect class="border2" x="2.5" y="2.5" fill="none" stroke-width="1.5" width="75" height="75"></rect>`;

exports.base = `<defs></defs><polygon class="shape" points="62.5,45 62.499,34.999 52.071,35 59.445,27.625 52.374,20.555 44.999,27.93 44.999,17.5 35,17.5 35,27.929 27.625,20.555 20.555,27.625 27.928,35 17.5,35 17.5,45 27.929,45 20.555,52.374 27.625,59.445 35,52.072 34.999,62.499 45,62.5 44.999,52.07 52.374,59.445 59.445,52.374 52.071,45 "></polygon><circle class="jewel" cx="40" cy="40" r="7.5"></circle><path class="border" d="M80,80H0V0h80V80L80,80z M2.5,77.5h75v-75h-75V77.5L2.5,77.5z"></path><rect class="border2" x="2.5" y="2.5" fill="none" stroke-width="1.5" width="75" height="75"></rect>`;

exports.mine_board = `<defs></defs>
<g class="mineMetal board">
    <circle cx="40" cy="40" r="4.2"></circle>
    <path d="M59.7,49.5C59.7,49.5,59.7,49.5,59.7,49.5c0.2-0.4,0.3-0.7,0.5-1.1c0,0,0-0.1,0-0.1c0.1-0.3,0.3-0.6,0.4-1
    c0-0.1,0.1-0.2,0.1-0.3c0.1-0.3,0.2-0.5,0.3-0.8c0-0.1,0.1-0.3,0.1-0.4c0.1-0.2,0.1-0.5,0.2-0.7c0-0.1,0.1-0.3,0.1-0.4
    c0.1-0.2,0.1-0.5,0.1-0.7c0-0.1,0.1-0.3,0.1-0.4c0-0.2,0.1-0.5,0.1-0.7c0-0.1,0-0.3,0.1-0.4c0-0.3,0.1-0.5,0.1-0.8
    c0-0.1,0-0.3,0-0.4c0-0.4,0-0.8,0-1.2c0-0.4,0-0.8,0-1.2c0-0.1,0-0.3,0-0.4c0-0.3,0-0.5-0.1-0.8c0-0.1,0-0.3-0.1-0.4
    c0-0.3-0.1-0.5-0.1-0.8c0-0.1,0-0.3-0.1-0.4c0-0.3-0.1-0.5-0.2-0.8c0-0.1-0.1-0.3-0.1-0.4c-0.1-0.3-0.1-0.5-0.2-0.8
    c0-0.1-0.1-0.2-0.1-0.3c-0.1-0.3-0.2-0.6-0.3-0.9c0-0.1,0-0.1-0.1-0.2c-0.3-0.7-0.6-1.5-0.9-2.2c0,0,0,0,0,0
    c-2.5-5.1-6.9-9.1-12.3-11c0,0,0,0,0,0c-0.4-0.1-0.7-0.2-1.1-0.4c-0.1,0-0.2,0-0.2-0.1c-0.3-0.1-0.6-0.2-0.9-0.2
    c-0.1,0-0.2-0.1-0.3-0.1c-0.3-0.1-0.5-0.1-0.8-0.2c-0.1,0-0.3,0-0.4-0.1c-0.3,0-0.5-0.1-0.8-0.1c-0.1,0-0.3,0-0.4-0.1
    c-0.3,0-0.6-0.1-0.8-0.1c-0.1,0-0.2,0-0.4,0c-0.4,0-0.8,0-1.2,0c-0.4,0-0.8,0-1.2,0c-0.1,0-0.3,0-0.4,0c-0.3,0-0.5,0-0.8,0.1
    c-0.1,0-0.3,0-0.4,0.1c-0.2,0-0.5,0.1-0.7,0.1c-0.1,0-0.3,0.1-0.4,0.1c-0.2,0-0.5,0.1-0.7,0.1c-0.1,0-0.3,0.1-0.4,0.1
    c-0.2,0.1-0.5,0.1-0.7,0.2c-0.1,0-0.3,0.1-0.4,0.1c-0.3,0.1-0.5,0.2-0.8,0.3c-0.1,0-0.2,0.1-0.3,0.1c-0.3,0.1-0.6,0.2-1,0.4
    c0,0-0.1,0-0.1,0c-6,2.5-10.6,7.6-12.5,13.9c0,0.1,0,0.1-0.1,0.2c-0.1,0.3-0.2,0.6-0.2,0.9c0,0.1,0,0.2-0.1,0.3
    c-0.1,0.3-0.1,0.6-0.2,0.8c0,0.1,0,0.3-0.1,0.4c0,0.3-0.1,0.5-0.1,0.8c0,0.1,0,0.3-0.1,0.4c0,0.3-0.1,0.6-0.1,0.8
    c0,0.1,0,0.2,0,0.4c0,0.4,0,0.8,0,1.2c0,0.4,0,0.8,0,1.2c0,0.1,0,0.2,0,0.4c0,0.3,0,0.6,0.1,0.8c0,0.1,0,0.3,0.1,0.4
    c0,0.3,0.1,0.5,0.1,0.8c0,0.1,0,0.3,0.1,0.4c0,0.3,0.1,0.5,0.2,0.8c0,0.1,0.1,0.2,0.1,0.3c0.1,0.3,0.1,0.6,0.2,0.9
    c0,0.1,0,0.2,0.1,0.2c0.1,0.4,0.2,0.7,0.4,1.1c0,0,0,0,0,0c1.9,5.4,5.9,9.8,11,12.3c0,0,0,0,0,0c0.7,0.3,1.4,0.7,2.2,0.9
    c0.1,0,0.1,0,0.2,0.1c0.3,0.1,0.6,0.2,0.9,0.3c0.1,0,0.2,0.1,0.3,0.1c0.3,0.1,0.5,0.1,0.8,0.2c0.1,0,0.3,0.1,0.4,0.1
    c0.3,0.1,0.5,0.1,0.8,0.2c0.1,0,0.3,0.1,0.4,0.1c0.3,0,0.5,0.1,0.8,0.1c0.1,0,0.3,0,0.4,0.1c0.3,0,0.5,0.1,0.8,0.1
    c0.1,0,0.3,0,0.4,0c0.4,0,0.8,0,1.2,0c0.4,0,0.8,0,1.2,0c0.1,0,0.2,0,0.4,0c0.3,0,0.6,0,0.8-0.1c0.1,0,0.3,0,0.4-0.1
    c0.3,0,0.5-0.1,0.8-0.1c0.1,0,0.3,0,0.4-0.1c0.3-0.1,0.6-0.1,0.8-0.2c0.1,0,0.2,0,0.3-0.1c0.3-0.1,0.6-0.2,0.9-0.2
    c0.1,0,0.1,0,0.2-0.1c1.2-0.4,2.3-0.8,3.4-1.3c0,0,0,0,0,0C54,57.4,57.5,53.9,59.7,49.5z M40,46.2c-3.4,0-6.2-2.8-6.2-6.2
    s2.8-6.2,6.2-6.2s6.2,2.8,6.2,6.2S43.4,46.2,40,46.2z"></path>
    <path fill="#1C1C1C" d="M18.9,51.1l-1,1c-1.6,1.6-1.6,4.1,0,5.7l4.4,4.4c1.6,1.6,4.1,1.6,5.7,0l1-1C24.7,58.9,21.2,55.4,18.9,51.1z "></path>';
    <path fill="#1C1C1C" d="M61.1,29l1.3-1.3c1.6-1.6,1.6-4.1,0-5.7L58,17.7c-1.6-1.6-4.1-1.6-5.7,0l-1.3,1.3 C55.4,21.2,58.9,24.7,61.1,29z"></path>';
    <path fill="#1C1C1C" d="M61.1,51c-2.2,4.3-5.7,7.8-10,10.1l1.1,1.1c1.6,1.6,4.1,1.6,5.7,0l4.4-4.4c1.6-1.6,1.6-4.1,0-5.7L61.1,51z"></path>';
    <path fill="#1C1C1C" d="M18.9,28.9c2.3-4.3,5.8-7.8,10.1-10l-1.2-1.2c-1.6-1.6-4.1-1.6-5.7,0L17.8,22c-1.6,1.6-1.6,4.1,0,5.7 L18.9,28.9z"></path>';
</g>
<circle class="mineLights" cx="30" cy="30" r="2"></circle>
<circle class="mineLights" cx="50" cy="30" r="2"></circle>
<circle class="mineLights" cx="30" cy="50" r="2"></circle>
<circle class="mineLights" cx="50" cy="50" r="2"></circle>`;

exports.circleStar = exports.circle + exports.star;
exports.circlePlus = exports.circle + exports.plus;
exports.circleX = exports.circle + exports.x;
exports.circleLeft = exports.circle + exports.left;
exports.circleRight = exports.circle + exports.right;
exports.circleUpLeft = exports.circle + exports.upLeft;
exports.circleUpRight = exports.circle + exports.upRight;
exports.circleUp = exports.circle + exports.up;
exports.circleDown = exports.circle + exports.down;
exports.circleDownLeft = exports.circle + exports.downLeft;
exports.circleDownRight = exports.circle + exports.downRight;
},{}],11:[function(require,module,exports){
/**
 * compile this with browserify
 */

window.Color = require('color');
window.tiles = require('./tiles');
window.boardUtil = require('./boardUtil');
window.playerUtil = require('./playerUtil');
window.drawUtil = require('./drawUtil');

},{"./boardUtil":9,"./drawUtil":10,"./playerUtil":12,"./tiles":13,"color":6}],12:[function(require,module,exports){
/**
 * For creating players
 */

exports.create = function(x, y) {
    return {
        x, y,
        stock: {
            star: 1,
            circle: 2,
            plus: Infinity,
            circlePlus: 2,
            x: Infinity,
            circleX: 2,
            left: 2,
            up: 2,
            right: 2,
            down: 2,
            upLeft: 2,
            downLeft: 2,
            upRight: 2,
            downRight: 2,
            reclaim: 1,
            mine: 3,
        }
    }
}
},{}],13:[function(require,module,exports){
/**
 * Contains tile information
 */

/**
 * @typedef tile
 * @prop {string} type
 * @prop {(tile) => boolean} canPlaceOn
 * @prop {(tile) => tile} whenPlacedOn
 * @prop {Object} properties
 * @prop {number} properties.x
 * @prop {number} properties.y
 * @prop {string[]} properties.owners
 * @prop {number} properties.fade
 * @prop {number[][]} properties.range
 */

 /**
  * @constant {tile} exports.blank
  */
exports.blank = args => ({
    type: 'blank',
    canPlaceOn: tile => false,
    whenPlacedOn: _ => _,
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [],
    },
});

/**
 * @constant {tile} exports.plus
 */
exports.plus = args => ({
    type: 'plus',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x - 1, args.y],
                [args.x + 1, args.y],
                [args.x, args.y - 1],
                [args.x, args.y + 1]]
    },
});

/**
 * @constant {tile} exports.x
 */
exports.x = args => ({
    type: 'x',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x - 1, args.y - 1],
                [args.x + 1, args.y + 1],
                [args.x + 1, args.y - 1],
                [args.x - 1, args.y + 1]]
    },
});

/**
 * @constant {tile} exports.left
 */
exports.left = args => ({
    type: 'left',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x - 1, args.y]]
    },
});

/**
 * @constant {tile} exports.right
 */
exports.right = args => ({
    type: 'right',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x + 1, args.y]]
    },
});

/**
 * @constant {tile} exports.up
 */
exports.up = args => ({
    type: 'up',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x, args.y - 1]]
    },
});

/**
 * @constant {tile} exports.down
 */
exports.down = args => ({
    type: 'down',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x, args.y + 1]]
    },
});

/**
 * @constant {tile} exports.upLeft
 */
exports.upLeft = args => ({
    type: 'upLeft',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x - 1, args.y - 1]]
    },
});

/**
 * @constant {tile} exports.upRight
 */
exports.upRight = args => ({
    type: 'upRight',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x + 1, args.y - 1]]
    },
});

/**
 * @constant {tile} exports.downLeft
 */
exports.downLeft = args => ({
    type: 'downLeft',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x - 1, args.y + 1]]
    },
});

/**
 * @constant {tile} exports.downRight
 */
exports.downRight = args => ({
    type: 'downRight',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x + 1, args.y + 1]]
    },
});

/**
 * @constant {tile} exports.star
 */
exports.star = args => ({
    type: 'star',
    canPlaceOn: tile => tile.type == 'blank',
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x - 1, args.y - 1],
                [args.x + 1, args.y + 1],
                [args.x + 1, args.y - 1],
                [args.x - 1, args.y + 1],
                [args.x - 1, args.y],
                [args.x + 1, args.y],
                [args.x, args.y - 1],
                [args.x, args.y + 1]]
    },
});

/**
 * @constant {tile} exports.circlePlus
 */
exports.circlePlus = args => ({
    type: 'circlePlus',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        circled: true,
        range: [[args.x - 2, args.y],
                [args.x + 2, args.y],
                [args.x, args.y - 2],
                [args.x, args.y + 2]]
    },
});

/**
 * @constant {tile} exports.circleX
 */
exports.circleX = args => ({
    type: 'circleX',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        circled: true,
        range: [[args.x - 2, args.y - 2],
                [args.x + 2, args.y + 2],
                [args.x + 2, args.y - 2],
                [args.x - 2, args.y + 2]]
    },
});

/**
 * @constant {tile} exports.circleLeft
 */
exports.circleLeft = args => ({
    type: 'circleLeft',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        circled: true,
        range: [[args.x - 2, args.y]]
    },
});

/**
 * @constant {tile} exports.circleRight
 */
exports.circleRight = args => ({
    type: 'circleRight',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        circled: true,
        range: [[args.x + 2, args.y]]
    },
});

/**
 * @constant {tile} exports.circleUp
 */
exports.circleUp = args => ({
    type: 'circleUp',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        circled: true,
        range: [[args.x, args.y - 2]]
    },
});

/**
 * @constant {tile} exports.circleDown
 */
exports.circleDown = args => ({
    type: 'circleDown',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        circled: true,
        range: [[args.x, args.y + 2]]
    },
});

/**
 * @constant {tile} exports.circleUpLeft
 */
exports.circleUpLeft = args => ({
    type: 'circleUpLeft',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        circled: true,
        range: [[args.x - 2, args.y - 2]]
    },
});

/**
 * @constant {tile} exports.circleUpRight
 */
exports.circleUpRight = args => ({
    type: 'circleUpRight',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        circled: true,
        range: [[args.x + 2, args.y - 2]]
    },
});

/**
 * @constant {tile} exports.circleDownLeft
 */
exports.circleDownLeft = args => ({
    type: 'circleDownLeft',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        circled: true,
        range: [[args.x - 2, args.y + 2]]
    },
});

/**
 * @constant {tile} exports.circleDownRight
 */
exports.circleDownRight = args => ({
    type: 'circleDownRight',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        circled: true,
        range: [[args.x + 2, args.y + 2]]
    },
});

/**
 * @constant {tile} exports.circleStar
 */
exports.circleStar = args => ({
    type: 'circleStar',
    canPlaceOn: tile => tile.type == 'blank',
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x - 2, args.y - 2],
                [args.x + 2, args.y + 2],
                [args.x + 2, args.y - 2],
                [args.x - 2, args.y + 2],
                [args.x - 2, args.y],
                [args.x + 2, args.y],
                [args.x, args.y - 2],
                [args.x, args.y + 2]]
    },
});

/**
 * @constant {tile} exports.mine
 */
exports.mine = args => ({
    type: 'mine',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: []
    },
});

/**
 * @constant {tile} exports.circle
 */
exports.circle = args => ({
    type: 'circle',
    canPlaceOn: tile => !/blank|collision|mine|base/.test(tile.type)
                        && !tile.properties.circled,
    whenPlacedOn: function(tile){
        let newType = 'circle' + 
                        tile.type.substring(0, 1).toUpperCase() +
                        tile.type.substring(1);
        return exports[newType]({
            x: this.properties.x,
            y: this.properties.y,
            placer: args.placer,
            owners: this.properties.owners,
        });
    },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: []
    },
});

/**
 * @constant {tile} exports.reclaim
 */
exports.reclaim = args => ({
    type: 'reclaim',
    canPlaceOn: function(tile) {
                    return !/blank|collision|mine|base/.test(tile.type)
                            && this.properties.placer
                            && tile.properties.owners.length == 1
                            && tile.properties.owners[0] == this.properties.placer; },
    whenPlacedOn: function(){
        return exports['blank']({
            x: this.properties.x,
            y: this.properties.y,
            owners: [],
        });
    },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [],
    },
});

/**
 * @constant {tile} exports.collision
 */
exports.collision = args => ({
    type: 'collision',
    canPlaceOn: tile => true,
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: args.fade || 6,
        placer: null,
        range: [],
    },
});

/**
 * @constant {tile} exports.base
 */
exports.base = args => ({
    type: 'base',
    canPlaceOn: tile => tile.type == 'blank',
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x - 1, args.y - 1],
                [args.x + 1, args.y + 1],
                [args.x + 1, args.y - 1],
                [args.x - 1, args.y + 1],
                [args.x - 1, args.y],
                [args.x + 1, args.y],
                [args.x, args.y - 1],
                [args.x, args.y + 1]]
    },
});
},{}]},{},[11]);
