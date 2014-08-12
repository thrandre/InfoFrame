SVG.Clock = function (size) {
	this.full = {
		hours: 0,
		minutes: 0,
		seconds: 0
	};

	this.time = {
		hours: 0,
		minutes: 0,
		seconds: 0
	};

	this.constructor.call(this, SVG.create("svg"));
	this.viewbox(0, 0, 100, 100);
	this.size(size, size);

	this.plate = this.circle(77)
		.stroke({ width: 10, color: "#fff" })
		.fill({ opacity: 0 })
		.move(10.5, 10.5);

	this.hours = this.rect(7, 20)
		.move(45.5, 29)
		.fill({ color: "#fff" });

	this.dot = this.circle(7)
		.move(45.5, 45.5)
		.fill({ color: "#fff" });

	this.minutes = this.rect(5, 25)
		.move(46.5, 24)
		.fill({ color: "#fff" });

	this.seconds = this.path()
		.stroke({ width: 3, color: "#fff" })
		.fill({ opacity: 0 });

	this.update(0);
}

SVG.Clock.prototype = new SVG.Container;

SVG.extend(SVG.Clock, {
	start: function() {
		var self = this;

		setInterval(function() {
			self.update();
		}, 100);

		return this;
	},
	update: function(duration) {
		var time = new Date();
		if (duration == null)
			duration = 300;

		this
			.setHours(time.getHours(), time.getMinutes())
			.setMinutes(time.getMinutes(), duration)
			.setSeconds(time.getSeconds() + time.getMilliseconds() / 1000, duration);

		return this;
	},
	setHours: function(hours, minutes) {
		this.time.hours = hours;

		this.hours
			.rotate((360 / 12 * ((hours + minutes / 60) % 12)), 49, 49);

		return this;
	},
	setMinutes: function(minutes, duration) {
		if (minutes == this.time.minutes)
			return this;

		this.time.minutes = minutes;

		if (minutes == 0)
			this.full.minutes++;

		var deg = this.full.minutes * 360 + 360 / 60 * minutes;

		if (duration)
			this.minutes
				.animate(duration)
				.rotate(deg, 49, 49);
		else
			this.minutes
				.rotate(deg, 49, 49);

		return this;
	},
	setSeconds: function(seconds, duration) {
		var r = (seconds / 60) * 2 * Math.PI,
			x = 49 + Math.sin(r) * 48,
			y = 49 + Math.cos(r) * -48,
			mid = (r > Math.PI) ? 1 : 0,
			anim = 'M 49,1 A 48,48 0 ' + mid + ',1 ' + x + ',' + y;

		this.seconds.plot(anim);
		return this;
	}

});

SVG.extend(SVG.Container, {
	clock: function(size) {
		return this.put(new SVG.Clock(size));
	}
});