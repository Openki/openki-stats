Router.configure({
	layoutTemplate: 'layout'
});

Router.map(function () {
	this.route('home', {
		path: '/',
		template: 'start'
	})
	
	this.route('showCourse', {
		path: 'course/:_id',
		template: 'coursedetails',
		data: function () {
			return Courses.findOne({_id: this.params._id})
		}
	})
	
	this.route('categorylist')
	this.route('courselist', {
		waitOn: function () {
			return Meteor.subscribe('courses');
		},
		data: function () {
			return Courses.find()
		}
	})
	
	this.route('pages', {
		path: 'page/:page_name',
		action: function() {
			this.render(this.params.page_name)
		}
	})
	
	this.route('profile')
	this.route('userprofile', {
		path: 'user/:_id',
		waitOn: function () {
			return Meteor.subscribe('users');
		},
		data: function () {
			return Meteor.users.findOne({_id: this.params._id})
		}
	})
})
