This file descripts all configurations and customization options. Remove the comment at the end of the line to make it work. 
```
{
	"admins": ["greg"], // User Administrator Accounts
	"prng": "", // Use the "static" value to define that a static seed should be used for test data
	"testdata": true, // Generates test data, is not needed for the productive system
	"public": {
		"siteName": "Openki-clone", 
		"siteStage": "beta", // The text top left at the logo
		"testWarning": true, // Shows a banner saying that this is only for testing
		"headerLogo": { "src": "openki-logo-web-2020.svg", "alt": "Openki Logo" }, // The logo in the top right corner
		"avatarLogo": { "src": "openki-logo-web-avatar-2020.svg", "alt": "User Avatar" }, // The default image used for avatars (color is changed using the CSS filter 'hue-rotate')
		"ogLogo": { "src": "openki_logo_2018.png"}, // The image to be shown in social media 
		"mailLogo": "mails/openki.png",
		"regionSelection": { 
			"minNumber": 5, // The minimum number of regions displayed in the Regions selection. Default: 5
			"aboutLink": "" // A link to a page that explains regions, if not set then none link is shown. 
		},
		"matomo": {
			"url": "https://analytics.mydomain.com/", 
			"site": 1 // Matomo id
		},
		"pricePolicyEnabled": true, // by true, show only indicative prices (DE: Richtpreise)
		"feature": {
			"login": { // toggle visibility of login services
				"google": true,
				"facebook": true,
				"github": true
			}
		},
		"footerLinks": [
			{
				"link": "https://about.openki.net/",
				"key": "footer.aboutOpenki",
				"title_key": "navigation.footer.about.title"
			},
			{
				"link": "/FAQ",
				"key": "main.faq_link",
				"title_key": "navigation.footer.faq.title"
			},
			{
				"link": "https://gitlab.com/Openki/Openki/",
				"text": "GitLab",
				"title_key": "navigation.footer.codeOnGitLab"
			}
		],
		"faqLink": "/FAQ",
		"courseGuideLink": null,
		"aboutLink": "https://about.openki.net",
		"categories": { // Categories for courses, main and/or sub categories
			"sports":
				[
					"martialarts",
					"teamsport",
					"artistry"
				],
			"handicraft":
				[
				],
			"[categoryname]":
				[
					"subcategoryname1",
					"subcategoryname2"
				],
		}
	},
	"siteEmail": "" // Sender e-mail address in mails
	"reporter": { "sender": "pingpong@mail.openki.net", "recipient": "badabuff@openki.net"}, // Sender and recipient address for "Report problem" function
	"robots": false, // Tells robots/crawlers whether to index the website or not
	"printLog": false, // Print the log on the server in the console, usually only for development
	"service": { // OAuth
		"facebook": {
			"appId": "567890",
			"secret": "123abcd"
		},
		"github": {
			"clientId": "1234cdef",
			"secret": "abcd1234"
		},
		"google": {
			"clientId": "01234-xyz123.apps.googleusercontent.com",
			"secret": "XYz_123"
		}
	},
	"PrerenderIO": { "serviceUrl": "http://localhost:3033/", "token": "mytoken" }, // That web pages are pre-rendered for webcrawlers on the server side so that no client code has to be executed
	"startup": { "buildDbCacheAsync": true }, // Build the cache in the db async or sync. For larger databases it takes a long time until all fields are updated, during this time the startup is blocked. The users cannot use the website. Because in a normal startup the database already has these fields, this task can also be done async.
	"scrub": // Delete entries from the log or remove critical information, The log can be viewed via .../log
		[ { "name": "scrub client-errors", "comment": "client-side errors may contain sensitive data, drop them quickly"
		  , "grace": 7, "select": { "tr": "clientError" }, "remove": true // "grace": 7 means: After 7 days it will be removed
		  }

		, { "name": "drop resume-logins",  "comment": "Resume-Logins are not very interesting"
		  , "grace": 7, "select": { "tr": "Login.Success", "body": {"type": "resume"}}, "remove": true // "remove": true means: The whole entry is removed
		  }
		  
		, { "name": "scrub logins", "comment": "We want to remember user logins but not the details"
		  , "grace": 8, "select": { "tr": "Login.Success"}, "unset": [ "connection", "username" ] // "unset": [ "field1", "field2", ... ] means: Individual fields are removed
		  }

        , { "name": "drop send-results", "comment": "We keep notification send results for troublehooting"
		  , "grace": 61, "select": { "tr": "Notification.SendResult"}, "remove": true
		  }
		]
}
```