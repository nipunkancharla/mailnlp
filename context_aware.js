function extractDatesAndAddToCalendar() {
  var keywords = ["internship", "hackathon", "placement", "seminar", "talk"];
  var threads = GmailApp.search("in:inbox newer_than:7d");
  
  for (var i = 0; i < threads.length; i++) {
    var message = threads[i].getMessages()[0];
    var subject = message.getSubject().toLowerCase();
    var body = message.getPlainBody().toLowerCase();
    
    var isRelevant = keywords.some(function(keyword) {
      return subject.includes(keyword) || body.includes(keyword);
    });
    
    if (isRelevant) {
      // Split body into lines for context analysis
      var lines = message.getPlainBody().split('\n');
      var bestDate = null;
      var bestTime = null;
      var summary = "";
      
      // Context keywords for deadlines and events
      var deadlineClues = ["due", "deadline", "submit by", "by"];
      var eventClues = ["on", "at", "starts", "scheduled"];
      
      // Analyze each line for dates and context
      for (var j = 0; j < lines.length; j++) {
        var line = lines[j].toLowerCase();
        
        // Try parsing a date from the line
        var parsedDate = parseDateFromLine(line);
        if (parsedDate) {
          var time = parseTimeFromLine(line);
          
          // Check context to prioritize
          var isDeadline = deadlineClues.some(clue => line.includes(clue));
          var isEvent = eventClues.some(clue => line.includes(clue));
          
          if (isDeadline) {
            bestDate = parsedDate; // Prioritize deadlines
            bestTime = time;
            break; // Stop once we find a deadline
          } else if (isEvent && !bestDate) {
            bestDate = parsedDate; // Use event date if no deadline found yet
            bestTime = time;
          }
          
          // Build summary from lines with keywords
          if (keywords.some(k => line.includes(k))) {
            summary += lines[j].trim() + " ";
          }
        }
      }
      
      if (bestDate) {
        var calendar = CalendarApp.getDefaultCalendar();
        var eventTitle = message.getSubject().substring(0, 50);
        
        if (bestTime) {
          var endTime = new Date(bestTime);
          endTime.setHours(endTime.getHours() + 1);
          calendar.createEvent(eventTitle, bestTime, endTime);
          Logger.log("Added event: " + eventTitle + " on " + bestTime + " | Summary: " + summary.trim());
        } else {
          calendar.createAllDayEvent(eventTitle, bestDate);
          Logger.log("Added all-day event: " + eventTitle + " on " + bestDate + " | Summary: " + summary.trim());
        }
      }
    }
  }
}

// Parse date from a line, assume current year if missing
function parseDateFromLine(line) {
  var currentYear = new Date().getFullYear(); // 2025
  var months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  var shortMonths = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  
  try {
    // Try parsing with full year
    var date = Utilities.parseDate(line, "GMT", "MM/dd/yyyy");
    if (date.getFullYear() > 1900) return date;
    
    date = Utilities.parseDate(line, "GMT", "dd-MMM-yyyy");
    if (date.getFullYear() > 1900) return date;
    
    // Try parsing without year, add 2025
    var dayMonthMatch = line.match(/(\d{1,2})(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i);
    if (dayMonthMatch) {
      var day = parseInt(dayMonthMatch[1]);
      var month = months.indexOf(dayMonthMatch[3].toLowerCase());
      return new Date(currentYear, month, day);
    }
    
    var shortMatch = line.match(/(\d{1,2})\/(\d{1,2})/);
    if (shortMatch) {
      return new Date(currentYear, shortMatch[2] - 1, shortMatch[1]);
    }
  } catch (e) {
    return null;
  }
  return null;
}

// Parse time from a line
function parseTimeFromLine(line) {
  var timeMatch = line.match(/(\d{1,2}(:\d{2})?\s*(am|pm))|(\d{1,2}:\d{2})|(\d{1,2}h\d{2})/i);
  if (!timeMatch) return null;
  
  var timeStr = timeMatch[0].toLowerCase();
  var hours, minutes = 0;
  
  if (timeStr.includes("h")) {
    var [h, m] = timeStr.split("h");
    hours = parseInt(h);
    minutes = parseInt(m);
  } else if (timeStr.includes(":")) {
    var [h, m] = timeStr.split(":");
    hours = parseInt(h);
    minutes = parseInt(m.replace(/am|pm/, ""));
  } else {
    hours = parseInt(timeStr.replace(/am|pm/, ""));
  }
  
  if (timeStr.includes("pm") && hours < 12) hours += 12;
  if (timeStr.includes("am") && hours === 12) hours = 0;
  
  var date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}
