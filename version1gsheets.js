function extractDatesAndAddToSheet() {
  var keywords = ["internship", "hackathon", "placement"];
  var threads = GmailApp.search("in:inbox newer_than:1d");
  var apiToken = "your-hugging-face-api-token";
  var sheetId = "your-google-sheet-id"; // Replace with your Sheet ID
  var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
  
  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    var messages = thread.getMessages();
    var fullThreadText = "";
    var subject = messages[0].getSubject().toLowerCase();
    
    for (var j = 0; j < messages.length; j++) {
      fullThreadText += messages[j].getPlainBody() + "\n";
    }
    var fullThreadTextLower = fullThreadText.toLowerCase();
    
    var isRelevant = keywords.some(function(keyword) {
      return subject.includes(keyword) || fullThreadTextLower.includes(keyword);
    });
    
    if (isRelevant) {
      var summary = getSummaryFromHuggingFace(fullThreadText, apiToken);
      var nerResults = getNERFromHuggingFace(fullThreadText, apiToken);
      var deadlineClues = ["due", "deadline", "submit by", "by"];
      var eventDate = null;
      var eventTime = null;
      
      Logger.log("NER Results: " + JSON.stringify(nerResults));
      
      for (var k = 0; k < nerResults.length; k++) {
        if (nerResults[k].entity_group === "DATE") {
          var dateStr = nerResults[k].word;
          var contextWindow = fullThreadTextLower.substring(
            Math.max(0, nerResults[k].start - 100),
            Math.min(fullThreadText.length, nerResults[k].end + 100)
          );
          
          if (deadlineClues.some(clue => contextWindow.includes(clue))) {
            eventDate = parseRefinedDate(dateStr);
            eventTime = parseTimeFromText(contextWindow, eventDate);
            Logger.log("Deadline found: " + dateStr + " at " + (eventTime || "no time"));
            break;
          }
        }
      }
      
      if (!eventDate) {
        var datePattern = /(\d{1,2}\/\d{1,2}\/\d{4})|(\d{1,2}(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4})|(\d{1,2}-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-\d{4})/i;
        var lines = fullThreadTextLower.split('\n');
        for (var k = 0; k < lines.length; k++) {
          if (deadlineClues.some(clue => lines[k].includes(clue))) {
            var dateMatch = lines[k].match(datePattern);
            if (dateMatch) {
              eventDate = parseRefinedDate(dateMatch[0]);
              eventTime = parseTimeFromText(lines[k], eventDate);
              Logger.log("Fallback deadline: " + dateMatch[0]);
              break;
            }
          }
        }
      }
      
      if (!eventDate) {
        eventDate = new Date();
        Logger.log("No deadline found, using today: " + eventDate);
      }
      
      var formLink = extractGoogleFormLink(fullThreadText);
      var eventTitle = messages[0].getSubject().substring(0, 50);
      
      // Append to Google Sheet
      var dateStr = eventDate.toLocaleDateString();
      var timeStr = eventTime ? eventTime.toLocaleTimeString() : "";
      sheet.appendRow([eventTitle, dateStr, timeStr, summary, formLink || ""]);
      Logger.log("Added to Sheet: " + eventTitle + " | " + dateStr + " | " + timeStr + " | " + summary);
    }
  }
}

// [Rest of the functions unchanged: getSummaryFromHuggingFace, getNERFromHuggingFace, extractGoogleFormLink, parseRefinedDate, parseTimeFromText]
