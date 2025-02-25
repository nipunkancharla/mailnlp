function extractDatesAndAddToCalendar() {
  var keywords = ["internship", "hackathon", "placement","intern"];
  var threads = GmailApp.search("in:inbox newer_than:7d");
  var apiToken = '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'; // Replace with your token
  
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
      var deadlineClues = ["due", "deadline"];
      var eventDate = null;
      var eventTime = null;
      
      // Log NER results for debugging
      //Logger.log("NER Results: " + JSON.stringify(nerResults));
      
      // Find deadline with NER
      for (var k = 0; k < nerResults.length; k++) {
        if (nerResults[k].entity_group === "DATE") {
          var dateStr = nerResults[k].word;
          var contextWindow = fullThreadTextLower.substring(
            Math.max(0, nerResults[k].start - 100), // Wider window
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
      
      // Fallback to regex if NER misses
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
      
      // Default to today if no deadline
      if (!eventDate) {
        eventDate = new Date();
        Logger.log("No deadline found, using today: " + eventDate);
      }
      
      var formLink = extractGoogleFormLink(fullThreadText);
      var description = "Summary: " + summary;
      if (formLink) description += "\nForm Link: " + formLink;
      
      var calendar = CalendarApp.getDefaultCalendar();
      var eventTitle = messages[0].getSubject().substring(0, 50);
      
      if (eventTime) {
        var endTime = new Date(eventTime);
        endTime.setHours(endTime.getHours() + 1);
        //calendar.createEvent(eventTitle, eventTime, endTime, {description: description});
        Logger.log("Added event: " + eventTitle + " on " + eventTime + " | " + description);
      } else {
        //calendar.createAllDayEvent(eventTitle, eventDate, {description: description});
        Logger.log("Added all-day event: " + eventTitle + " on " + eventDate + " | " + description);
      }
    }
  }
}

function getSummaryFromHuggingFace(text, apiToken) {
  var url = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn";
  var payload = {
    "inputs": text.substring(0, 1000), // Increased to 1000 chars
    "parameters": {"max_length": 100, "min_length": 30}
  };
  
  var options = {
    "method": "post",
    "headers": {"Authorization": "Bearer " + apiToken},
    "payload": JSON.stringify(payload),
    "contentType": "application/json",
    "muteHttpExceptions": true
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var result = JSON.parse(response.getContentText());
    return result[0].summary_text;
  } catch (e) {
    Logger.log("Summarization error: " + e);
    return "Unable to summarize.";
  }
}

function getNERFromHuggingFace(text, apiToken) {
  var url = "https://api-inference.huggingface.co/models/dslim/bert-base-NER";
  var payload = {
    "inputs": text.substring(0, 1000) // Increased to 1000 chars
  };
  
  var options = {
    "method": "post",
    "headers": {"Authorization": "Bearer " + apiToken},
    "payload": JSON.stringify(payload),
    "contentType": "application/json",
    "muteHttpExceptions": true
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    return JSON.parse(response.getContentText());
  } catch (e) {
    Logger.log("NER error: " + e);
    return [];
  }
}

function extractGoogleFormLink(text) {
  var formPattern = /https:\/\/docs\.google\.com\/forms\/d\/e\/[a-zA-Z0-9_-]+/i;
  var match = text.match(formPattern);
  return match ? match[0] : null;
}

function parseRefinedDate(dateStr) {
  dateStr = dateStr.toLowerCase();
  var today = new Date();
  var currentYear = today.getFullYear();
  
  try {
    if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(dateStr)) {
      var [month, day, year] = dateStr.split('/').map(Number);
      return new Date(year, month - 1, day);
    }
    if (/\d{1,2}\/\d{1,2}/.test(dateStr)) {
      var [month, day] = dateStr.split('/').map(Number);
      return new Date(currentYear, month - 1, day);
    }
    if (/\d{1,2}-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-\d{4}/.test(dateStr)) {
      var [day, monthStr, year] = dateStr.split('-');
      var month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(monthStr);
      return new Date(year, month, day);
    }
    return new Date(dateStr.replace(/(st|nd|rd|th)/i, "")) || today;
  } catch (e) {
    return today;
  }
}

function parseTimeFromText(text) {
  var timePattern = /(\d{1,2}(:\d{2})?\s*(am|pm))|(\d{1,2}:\d{2})|(\d{1,2}h\d{2})/i;
  var timeMatch = text.match(timePattern);
  if (!timeMatch) return null;
  
  var timeStr = timeMatch[0].toLowerCase();
  var hours, minutes = 0;
  
  if (timeStr.includes("h")) {
    var [hourPart, minPart] = timeStr.split("h");
    hours = parseInt(hourPart);
    minutes = parseInt(minPart);
  } else if (timeStr.includes(":")) {
    var [hourPart, minPart] = timeStr.split(":");
    hours = parseInt(hourPart);
    minutes = parseInt(minPart.replace(/am|pm/, ""));
  } else {
    hours = parseInt(timeStr.replace(/am|pm/, ""));
  }
  
  if (timeStr.includes("pm") && hours < 12) hours += 12;
  if (timeStr.includes("am") && hours === 12) hours = 0;
  
  var eventDateTime = new Date();
  eventDateTime.setHours(hours, minutes, 0, 0);
  return eventDateTime;
}
