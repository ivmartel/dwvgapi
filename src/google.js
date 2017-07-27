/**
 * Google related utils.
 * Depends upon:
 * - https://apis.google.com/js/api.js: auth and picker
 * - https://apis.google.com/js/client.js: drive and request
 */
var dwv = dwv || {};
/** @namespace */
dwv.google = dwv.google || {};
// external
var gapi = gapi || {};
var google = google || {};

/**
* Google Authentification class.
* Allows to authentificate to google services.
*/
dwv.google.Auth = function ()
{
    // closure to self
    var self = this;

    // TODO: move the keys in a separate server file to avoid problems
    // The Client ID obtained from the Google Developers Console. Replace with your own Client ID.
    var clientId = "575535891659-7upjbdjfkeudbavrqlra1t89rl7auubg.apps.googleusercontent.com";
    // The Browser API key obtained from the Google Developers Console.
    var apiKey = 'AIzaSyAWaruW4R0igZ5qcuHFHv0wNhSUp9amyJg';

    // The scope to use to access user's Drive items.
    var scope = 'https://www.googleapis.com/auth/drive.readonly';

    // Google auth instance.
    var googleAuth;

    /**
     * Load the API and authentify silently.
     */
     this.loadSilent = function () {
         dwv.log("dwv.google.Auth.loadSilent");

         // Load the API's client and auth2 modules.
         // Call the initClient function after the modules load.
         gapi.load('client:auth2', onApiLoad);
     };

    /**
    * Called if the authentification is successful.
    * Default does nothing. No input parameters.
    */
    this.onload = function () {};

    /**
    * Callback to be overloaded.
    * Default does nothing. No input parameters.
    */
    this.onfail = function () {};

    /**
    * Authentificate.
    */
    function onApiLoad() {
        dwv.log("dwv.google.Auth::onApiLoad");

        // Retrieve the discovery document for version 3 of Google Drive API.
        // In practice, your app can retrieve one or more discovery documents.
        var discoveryUrl = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

        // Initialize the gapi.client object, which app uses to make API requests.
        // Get API key and client ID from API Console.
        // 'scope' field specifies space-delimited list of access scopes.
        gapi.client.init({
            'apiKey': apiKey,
            'discoveryDocs': [discoveryUrl],
            'clientId': clientId,
            'scope': scope
        }).then( function () {
            dwv.log("dwv.google.Auth::onApiLoad: client.init success");

            // get the auth instance
            googleAuth = gapi.auth2.getAuthInstance();
            // Listen for sign-in state changes.
            googleAuth.isSignedIn.listen(updateSigninStatus);
            // Sign in the user if they are currently signed out
            // or call update directly
            if (googleAuth.isSignedIn.get() === false) {
                googleAuth.signIn({'ux_mode': 'redirect'});
            } else {
                updateSigninStatus(true);
            }

        }, function(error) {
            dwv.log("dwv.google.Auth::onApiLoad: client.init fail");
            dwv.log(error.error);
            dwv.log(error.details);
        });
    }

    /**
    * updateSigninStatus callback.
    * @param {Boolean} isSignedIn Is the user signed in?
    */
    function updateSigninStatus(isSignedIn) {
        dwv.log("dwv.google.Auth::updateSigninStatus");
        dwv.log("isSignedIn: "+isSignedIn);

        if (isSignedIn) {
            // continue if authoriised
            var user = googleAuth.currentUser.get();
            var isAuthorized = user.hasGrantedScopes(scope);
            dwv.log("isAuthorized: "+isAuthorized );
            if (isAuthorized) {
                self.onload();
            } else {
                self.onfail();
            }
        }
    }
};

/**
* Google Picker class.
* Allows to create a picker and handle its result.
*/
dwv.google.Picker = function ()
{
    // closure to self
    var self = this;

    /**
    * Load API and create picker.
    */
    this.load = function () {
        gapi.load('picker', {'callback': onApiLoad});
    };

    /**
    * Called after user picked files.
    * @param {Array} ids The list of picked files ids.
    */
    this.onload = null;

    /**
    * Create the picker.
    */
    function onApiLoad() {
        var view = new google.picker.View(google.picker.ViewId.DOCS);
        view.setMimeTypes("application/dicom");

        var user = gapi.auth2.getAuthInstance().currentUser.get();
        var oauthResponse = user.getAuthResponse(true);

        // see https://developers.google.com/picker/docs/reference#PickerBuilder
        var picker = new google.picker.PickerBuilder()
            .enableFeature(google.picker.Feature.NAV_HIDDEN)
            .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
            .setOAuthToken(oauthResponse.access_token)
            .addView(view)
            .setCallback(handleResult)
            .build();
        picker.setVisible(true);
    }

    /**
    * Launch callback if all good.
    * @param {Object} data The data returned by the picker.
    * See https://developers.google.com/picker/docs/results
    */
    function handleResult(data) {
        if (data.action === google.picker.Action.PICKED &&
            data.docs.length !== 0 ) {
            var ids = [];
            for (var i = 0; i < data.docs.length; ++i) {
                ids[ids.length] = data.docs[i].id;
            }
            self.onload(ids);
        }
    }
};

/**
* Google Drive class.
* Allows to request google drive for file download links from a list of file ids.
*/
dwv.google.Drive = function ()
{
    // closure to self
    var self = this;
    // list of ids
    var idList = null;

    // The Browser API key obtained from the Google Developers Console.
    this.apiKey = 'AIzaSyAWaruW4R0igZ5qcuHFHv0wNhSUp9amyJg';

    /**
    * Set the ids to ask for download link.
    * @param {Array} ids The list of file ids to ask for download link.
    */
    this.setIds = function (ids) {
        dwv.log("dwv.google.Drive.setIds");
        dwv.log("ids: "+ids);
        idList = ids;
    };

    /**
    * Get the ids to ask for download link.
    */
    this.getIds = function () {
        return idList;
    };

    /**
    * Load API and query drive for download links.
    * @param {Array} ids The list of file ids to ask for download link.
    */
    this.loadIds = function (ids) {
        self.setIds(ids);
        self.load();
    };

    /**
    * Load API and query drive for download links.
    * The ids to ask for have been provided via the setIds.
    */
    this.load = function () {
        dwv.log("dwv.google.Drive.load");
        // set the api key
        gapi.client.setApiKey(self.apiKey);

        // load api
        var func = createApiLoad(self.getIds());
        gapi.client.load('drive', 'v3', func);
    };

    /**
    * Called after drive response with the file urls.
    * @param {Array} urls The list of files urls corresponding to the input ids.
    */
    this.onload = null;

    /**
    * Create an API load handler.
    * @param {Array} ids The list of file ids to ask for download link.
    */
    function createApiLoad(ids) {
        var f = function () { onApiLoad(ids); };
        return f;
    }

    /**
    * Run the drive request.
    * @param {Array} ids The list of file ids to ask for download link.
    */
    function onApiLoad(ids) {
        dwv.log("dwv.google.Drive::onApiLoad");
        // group requests in batch (ans stay bellow quotas)
        var batch = gapi.client.newBatch();

        for (var i = 0; i < ids.length; ++i) {
            // see https://developers.google.com/drive/v3/reference/files/get
            var request = gapi.client.drive.files.get({
                //'fileId': ids[i], 'fields': 'webContentLink' // v3
                'fileId': ids[i], 'fields': 'id' // v3
                //'fileId': ids[i], 'alt': 'media' // v3
            });
            // add to batch
            batch.add(request);
        }

        // execute the batch
        batch.execute( handleDriveLoad );
    }

    /**
    * Launch callback when all queries have returned.
    * @param {Object} resp The batch request response.
    * See https://developers.google.com/api-client-library/...
    *   ...javascript/reference/referencedocs#gapiclientRequestexecute
    */
    function handleDriveLoad(resp) {
        // link list
        var urls = [];
        // ID-response map of each requests response
        var respKeys = Object.keys(resp);
        for ( var i = 0; i < respKeys.length; ++i ) {
            //urls[urls.length] = resp[respKeys[i]].result.webContentLink; // v3
            urls[urls.length] = "https://www.googleapis.com/drive/v3/files/"+resp[respKeys[i]].result.id+"?alt=media";
        }
        // call onload
        self.onload(urls);
    }
};

/**
 * Append authorized header to the input callback arguments.
 * @param {Function} callback The callback to append headers to.
 */
dwv.google.getAuthorizedCallback = function (callback) {
    var func = function (urls) {

        //see https://developers.google.com/api-client-library/javascript/features/cors

        var user = gapi.auth2.getAuthInstance().currentUser.get();
        var oauthResponse = user.getAuthResponse(true);

        var header = {
            "name": "Authorization",
            "value": "Bearer " + oauthResponse.access_token,
            "token": oauthResponse.access_token
        };
        callback(urls, [header]);
    };
    return func;
};

/**
 * GoogleDriveLoad gui.
 * @constructor
 */
dwv.gui.GoogleDriveLoad = function ()
{
    /**
     * Setup the gdrive load HTML to the page.
     */
    this.setup = function()
    {
        // behind the scenes authentification to avoid popup blocker
        //var gAuth = new dwv.google.Auth();
        //gAuth.loadSilent();

        // associated div
        var loadButton = document.createElement("button");
        loadButton.className = "ui-btn ui-btn-inline";
        loadButton.id = "load-btn";
        loadButton.style.display = "none";
        loadButton.appendChild(document.createTextNode("load"));

        var main = document.getElementById("main");
        main.appendChild(loadButton);
    };

    /**
     * Display the file load HTML.
     * @param {Boolean} bool True to display, false to hide.
     */
    this.display = function (bool, callback)
    {
        // gdrive div element
        var loadButton = document.getElementById("load-btn");
        loadButton.style.display = bool ? "" : "none";

        var onClick = function() {
            var gAuth = new dwv.google.Auth();
            var gPicker = new dwv.google.Picker();
            var gDrive = new dwv.google.Drive();
            // pipeline
            gAuth.onload = gPicker.load;
            gPicker.onload = gDrive.loadIds;
            gDrive.onload = dwv.google.getAuthorizedCallback(callback);
            // launch
            gAuth.loadSilent();
        };

        if (bool) {
            loadButton.onclick = onClick;
        } else {
            loadButton.onclick = function() {};
        }
    };
};
