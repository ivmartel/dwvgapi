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
    // setup the dicom parser
    var dicomParser = new dwv.dicom.DicomParser();
    // parse the buffer
    dicomParser.parse(this.response);
    // get the raw dicom tags
    var rawTags = dicomParser.getRawDicomElements();
    // modality
    var modality = rawTags.x00080060.value[0];

    // display
    var p1 = document.getElementById("p1");
    p1.appendChild(document.createTextNode("Modality: "+modality));
};

// Handle urls from a query
// -> load the first one
gapitest.onInputURLs = function (urls, requestHeaders) {
    var url = urls[0];
    console.log("url: "+url);
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    // optional request headers
    if ( typeof requestHeaders !== "undefined" ) {
        for (var j = 0; j < requestHeaders.length; ++j) {
            if ( typeof requestHeaders[j].name !== "undefined" &&
                typeof requestHeaders[j].value !== "undefined" ) {
                request.setRequestHeader(requestHeaders[j].name, requestHeaders[j].value);
            }
        }
    }
    request.responseType = "arraybuffer";
    request.onload = gapitest.onLoadUrl;
    request.send(null);
};

// main
var query = dwv.utils.getUriQuery(window.location.href);
if ( query && typeof query.input !== "undefined" ) {
    gapitest.decodeQuery(query, gapitest.onInputURLs);
} else {
    console.warn("No query to process...");
}
