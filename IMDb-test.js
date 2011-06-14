{
        "translatorID": "aff274ac-d3d1-4977-80f4-5320613226ec",
        "label": "IMDb",
        "creator": "Avram Lyon",
        "target": "^https?://www\\.imdb\\.com/",
        "minVersion": "2.1",
        "maxVersion": "",
        "priority": 100,
        "inRepository": true,
        "translatorType": 4,
        "lastUpdated": "2011-06-14 21:03:15"
}

function detectWeb(doc, url){
	if (url.match(/\/title\/tt\d+/)) {
		return "film";
	} else if (url.match(/\/find\?/)){
		return "multiple";
	}
}

function doWeb(doc, url){
	var n = doc.documentElement.namespaceURI;
	var ns = n ? function(prefix) {
		if (prefix == 'x') return n; else return null;
	} : null;
	
	var ids = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var results = doc.evaluate('//td[a[contains(@href,"/title/tt")]]', doc, ns, XPathResult.ANY_TYPE, null);
		var items = new Array();
		var result;
		while(result = results.iterateNext()) {
			var link = doc.evaluate('./a[contains(@href,"/title/tt")]', result, ns, XPathResult.ANY_TYPE, null).iterateNext();
			var title = result.textContent;
			Zotero.debug(link.href);
			var url = link.href.match(/\/title\/(tt\d+)/)[1];
			items[url] = title;
		}
		
		Zotero.selectItems(items, function(items) {
			if(!items) {
				Zotero.done();
				return true;
			}
			for (var i in items) {
				ids.push(i);
			}
			apiFetch(ids);
		});
	} else {
		var id = url.match(/\/title\/(tt\d+)/)[1];
		apiFetch([id]);
	}
	Zotero.wait();
}

// Takes IMDB IDs and makes items
function apiFetch(ids) {
	var apiRoot = "http://imdbapi.com/?tomatoes=true&i=";
	for (i in ids) ids[i] = apiRoot + ids[i];
	Zotero.Utilities.doGet(ids, parseIMDBapi, function() {Zotero.done()});
}

// parse result from imdbapi.com
// should be json
function parseIMDBapi(text, response, url) {
	Zotero.debug(url);
	Zotero.debug(text);
	try {
		var obj = JSON.parse(text);
	} catch (e) {
		Zotero.debug("JSON parse error");
		throw e;
	}
	var item = new Zotero.Item("film");
	item.title = obj.Title;
	item.date = obj.Released ? obj.Released : obj.Year;
	item.genre = obj.Genre;
	if(obj.Director) item = addCreator(item, obj.Director, "director");	
	if(obj.Writer) item = addCreator(item, obj.Writer, "scriptwriter");
	if(obj.Actors) item = addCreator(item, obj.Actors, "contributor");
	item.abstractNote = obj.Plot;
	item.attachments.push({url:obj.Poster, title:"Poster"});
	item.runningTime = obj.Runtime;
	item.extra = "IMDB ID: " + obj.ID;
	item.extra += "; IMDB Rating: " + obj.Rating + " ("+obj.Votes+" votes)";
	item.extra += "; Rotten Tomatoes: " + obj.tomatoRating
				 + " ("+obj.tomatoReviews+" reviews "
				 +" "+obj.tomatoFresh +" fresh, "+obj.tomatoRotten+" rotten)"
				 +", Tomato Meter: "+obj.tomatoMeter;
	item.complete();
}

function addCreator (item, creator, type) {
	if (creator == "N/A") {
		Zotero.debug("Discarding "+type+"="+creator);
		return item;
	}
	var broken = creator.split(",");
	for (i in broken) {
		item.creators.push(Zotero.Utilities.cleanAuthor(broken[i], type));
	}
	return item;
}

/** BEGIN TEST CASES **/
var testCases = [
    {
        "type": "web",
        "url": "http://www.imdb.com/title/tt0061722/",
        "items": [
            {
                "itemType": "journalArticle",
                "title": "Title"
            }
        ]
    },
    {
        "type": "web",
        "url": "https://www.imdb.com/title/tt0061722/",
        "items": [
            {
                "itemType": "journalArticle",
                "title": "Title"
            }
        ]
    }
]
/** END TEST CASES **/
