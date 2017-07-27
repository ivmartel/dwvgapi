var gapitest = gapitest || {};

// Decode input query
// type=gdrive launches google auth
gapitest.decodeQuery = function (query, callback)
{
    if (query.type === "gdrive") {
        var gAuth = new dwv.google.Auth();
        var gDrive = new dwv.google.Drive();
        gDrive.setIds( query.input.split(',') );
        // pipeline
        gAuth.onload = gDrive.load;
        gAuth.onfail = function () {
            $("#popupAuth").popup("open");
            var authorizeButton = document.getElementById('gauth-button');
            // explicit auth from button to allow popup
            authorizeButton.onclick = function() {
                $("#popupAuth").popup("close");
                //gAuth.load();
                gAuth.signIn();
            };
        };
        gDrive.onload = dwv.google.getAuthorizedCallback(callback);
        // launch with silent auth
        gAuth.loadSilent();
    }
    else {
        // default
        dwv.utils.base.decodeQuery(query, callback);
    }
};

// Handle an url load
// -> display the dicom data modality
gapitest.onLoadUrl = function () {

    if (this.status !== 200 && this.status !== 0) {
        console.error("Error status: " + this.status);
        return;
    }

    dwv.log("Loaded url!");

    // setup the dicom parser
    var dicomParser = new dwv.dicom.DicomParser();
    // parse the buffer
    dicomParser.parse(this.response);
    // get the raw dicom tags
    var rawTags = dicomParser.getRawDicomElements();
    // modality
    var modality = rawTags.x00080060.value[0];

    // display
    var presult = document.getElementById("result");
    presult.appendChild(document.createTextNode("Modality: "+modality));
};

// Handle urls from a query
// -> load the first one
gapitest.onInputURLs = function (urls, requestHeaders) {
    var url = urls[0];
    dwv.log("gapitest.onInputURLs");
    dwv.log("url: "+url);
    var request = new XMLHttpRequest();

    //url += "&access_token=" + encodeURIComponent(requestHeaders[0].token);

    request.open('GET', url, true);
    // optional request headers
    if ( typeof requestHeaders !== "undefined" ) {
        var requestHeader = requestHeaders[0];
        if ( typeof requestHeader.name !== "undefined" &&
            typeof requestHeader.value !== "undefined" ) {
            request.setRequestHeader(requestHeader.name, requestHeader.value);
        }
    }

    request.responseType = "arraybuffer";
    request.onload = gapitest.onLoadUrl;
    request.onerror = function () {
        console.error("XMLHttpRequest Error...");
    };
    request.send(null);
};

// main
$(document).ready( function() {
    var query = dwv.utils.getUriQuery(window.location.href);
    if ( query && typeof query.input !== "undefined" ) {
        console.debug("Query mode");
        gapitest.decodeQuery(query, gapitest.onInputURLs);
    } else {
        console.debug("Picker mode");
        var gDriveLoad = new dwv.gui.GoogleDriveLoad();
        gDriveLoad.setup();
        gDriveLoad.display(true, gapitest.onInputURLs);
    }
});
