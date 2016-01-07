lgs = {
	'ar': { lg: 'ar', name: 'العربية', short: 'العربية', english:'Arabic'},
	'da': { lg: 'da', name: 'Dansk', short: 'da', english:'Danish'},
	'de': { lg: 'de', name: 'Deutsch', short: 'de', english:'German'},
	'el': { lg: 'el', name: 'Ελληνικά', short: 'Ελ', english:'Greek'},
	'en': { lg: 'en', name: 'English', short: 'en', english:'English'},
	'es': { lg: 'es', name: 'Castellano', short: 'es', english:'Spanish'},
	'fr': { lg: 'fr', name: 'Français', short: 'fr', english:'French'},
	'it': { lg: 'it', name: 'Italiano', short: 'it', english:'Italian'},
	'ja': { lg: 'ja', name: '日本語', short: '日本語', english:'Japanese'},
	'tr': { lg: 'tr', name: 'Türkçe', short: 'tr', english:'Turkish'},
	'zh_TW': { lg: 'zh_TW', name: '國語', short: '國語', english:'Guóyǔ, Taiwanese'},
	'de_ZH': { lg: 'de_ZH', name: 'Züritüütsch', short: 'zri-tü', english:'Zurich German'}
};

Template.lang_sel.helpers({
	lgs: function() {
		return _.values(lgs);
	},

	short: function() {
		var lg = lgs[Session.get('locale')];
		if (lg) return lg.short;
	}

});

Template.lang_sel.events({
	'click a.langselect': function(e){
		localStorage.setItem('locale', this.lg);
		Session.set('locale', this.lg);
		e.preventDefault();
		if (Meteor.user()){
			Meteor.call('updateUserLocale', this.lg);
		}
	}
});

// Always load english translation
// For dynamically constructed translation strings there is no default
// translation and meteor would show the translation key if there is no
// translation in the current locale
mfPkg.loadLangs('en');
