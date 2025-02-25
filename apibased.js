function extractDatesAndAddToCalendar() {
  var keywords = ["internship", "hackathon", "placement"];
  var threads = GmailApp.search("in:inbox newer_than:7d");
  var apiToken = "your-hugging-face-api-token"; // Replace with your token from huggingface.co
  
  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    var messages = thread.getMessages();
    var fullThreadText = "";
    var subject = messages[0].getSubject().toLowerCase();
    
    // Combine all messages in thread for analysis
    for (var j = 0; j < messages.length; j++) {
      fullThreadText += messages[j].getPlainBody() + "\n";
    }
    fullThreadText = fullThreadText.toLowerCase();
    
    var isRelevant = keywords.some(function(keyword) {
      return subject.includes(keyword) || fullThreadText.includes(keyword);
    });
    
    if (isRelevant) {
      // Summarize with Hugging Face API
      var summary = getSummaryFromHuggingFace(fullThreadText, apiToken);
      
      // Look for deadlines with context
      var deadlineClues = ["due", "deadline", "submit by", "by"];
      var datePattern = /(\d{1,2}\/\d{1,2}\/\d{4})|(\d{1,2}(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4})|(\d{1,2}-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-\d{4})|(tomorrow|next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))/i;
      var timePattern = /(\d{1,2}(:\d{2})?\s*(am|pm))|(\d{1,2}:\d{2})|(\d{1,2}h\d{2})/i;
      
      var eventDate = null;
      var eventTime = null;
      var lines = fullThreadText.split('\n');
      
      // Search for deadline
      for (var k = 0; k < lines.length; k++) {
        if (deadlineClues.some(clue => lines[k].includes(clue))) {
          var dateMatch = lines[k].match(datePattern);
          var timeMatch = lines[k].match(timePattern);
          if (dateMatch) {
            eventDate = parseRefinedDate(dateMatch[0]);
            eventTime = timeMatch ? parseRefinedTime(timeMatch[0], eventDate) : null;
            break; // Use first deadline found
          }
        }
      }
      
      // If no deadline, default to today
      if (!eventDate) {
        eventDate = new Date(); // Today
      }
      
      // Look for Google Form link
      var formLink = extractGoogleFormLink(fullThreadText);
      var description = "Summary: " + summary;
      if (formLink) {
        description += "\nForm Link: " + formLink;
      }
      
      // Add to calendar
      var calendar = CalendarApp.getDefaultCalendar();
      var eventTitle = messages[0].getSubject().substring(0, 50);
      
      if (eventTime) {
        var endTime = new Date(eventTime);
        endTime.setHours(endTime.getHours() + 1);
        calendar.createEvent(eventTitle, eventTime, endTime, {description: description});
        Logger.log("Added event: " + eventTitle + " on " + eventTime + " | " + description);
      } else {
        calendar.createAllDayEvent(eventTitle, eventDate, {description: description});
        Logger.log("Added all-day event: " + eventTitle + " on " + eventDate + " | " + description);
      }
    }
  }
}

// Hugging Face API call for summarization
function getSummaryFromHuggingFace(text, apiToken) {
  var url = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn";
  var payload = {
    "inputs": text.substring(0, 500), // Limit to 500 chars due to API constraints
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
    Logger.log("Error summarizing: " + e);
    return "Unable to summarize.";
  }
}

// Extract Google Form link
function extractGoogleFormLink(text) {
  var formPattern = /https:\/\/docs\.google\.com\/forms\/d\/e\/[a-zA-Z0-9_-]+/i;
  var match = text.match(formPattern);
  return match ? match[0] : null;
}

// Date parsing (unchanged from your version)
function parseRefinedDate(dateStr) {
  dateStr = dateStr.toLowerCase();
  var today = new Date();
  
  if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(dateStr)) {
    var [month, day, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  } 
  else if (/\d{1,2}-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-\d{4}/.test(dateStr)) {
    var [day, monthStr, year] = dateStr.split('-');
    var month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(monthStr);
    return new Date(year, month, day);
  } 
  else if (/(tomorrow|next\s+\w+)/.test(dateStr)) {
    if (dateStr === "tomorrow") {
      today.setDate(today.getDate() + 1);
      return today;
    } else {
      var days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      var targetDay = days.indexOf(dateStr.split("next ")[1]);
      var currentDay = today.getDay();
      var daysToAdd = (targetDay - currentDay + 7) % 7 || 7;
      today.setDate(today.getDate() + daysToAdd);
      return today;
    }
  } 
  else {
    return new Date(dateStr.replace(/(st|nd|rd|th)/i, ""));
  }
}

// Time parsing (unchanged)
function parseRefinedTime(timeStr, date) {
  timeStr = timeStr.toLowerCase();
  var hours, minutes = 0;
  
  if (timeStr.includes("h")) {
    var [hourPart, minPart] = timeStr.split("h");
    hours = parseInt(hourPart);
    minutes = parseInt(minPart);
  } 
  else if (timeStr.includes(":")) {
    var [hourPart, minPart] = timeStr.split(":");
    hours = parseInt(hourPart);
    minutes = parseInt(minPart.replace(/am|pm/, ""));
  } 
  else {
    hours = parseInt(timeStr.replace(/am|pm/, ""));
    minutes = 0;
  }
  
  if (timeStr.includes("pm") && hours < 12) hours += 12;
  if (timeStr.includes("am") && hours === 12) hours = 0;
  
  var eventDateTime = new Date(date);
  eventDateTime.setHours(hours, minutes, 0, 0);
  return eventDateTime;
}
