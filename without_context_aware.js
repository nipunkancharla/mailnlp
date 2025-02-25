function extractDatesAndAddToCalendar() {
  // Keywords to filter relevant emails
  var keywords = ["internship", "hackathon", "placement", "seminar", "talk"];
  var threads = GmailApp.search("in:inbox newer_than:7d"); // Last 7 days of inbox emails
  
  for (var i = 0; i < threads.length; i++) {
    var message = threads[i].getMessages()[0];
    var subject = message.getSubject().toLowerCase();
    var body = message.getPlainBody().toLowerCase();
    
    // Check if email matches any keyword
    var isRelevant = keywords.some(function(keyword) {
      return subject.includes(keyword) || body.includes(keyword);
    });
    
    if (isRelevant) {
      // Refined date and time patterns
      var datePattern = /(\d{1,2}\/\d{1,2}\/\d{4})|(\d{1,2}(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4})|(\d{1,2}-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-\d{4})|(tomorrow|next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))/i;
      var timePattern = /(\d{1,2}(:\d{2})?\s*(am|pm))|(\d{1,2}:\d{2})|(\d{1,2}h\d{2})/i;
      
      var dateMatch = body.match(datePattern) || subject.match(datePattern);
      var timeMatch = body.match(timePattern) || subject.match(timePattern);
      
      if (dateMatch) {
        var eventDate = parseRefinedDate(dateMatch[0]); // Improved date parsing
        var eventTime = timeMatch ? parseRefinedTime(timeMatch[0], eventDate) : null;
        
        // Create calendar event
        var calendar = CalendarApp.getDefaultCalendar();
        var eventTitle = message.getSubject().substring(0, 50);
        
        if (eventTime) {
          var endTime = new Date(eventTime);
          endTime.setHours(endTime.getHours() + 1); // 1-hour duration
          calendar.createEvent(eventTitle, eventTime, endTime);
          Logger.log("Added event with time: " + eventTitle + " on " + eventTime);
        } else {
          calendar.createAllDayEvent(eventTitle, eventDate);
          Logger.log("Added all-day event: " + eventTitle + " on " + eventDate);
        }
      }
    }
  }
}

// Improved date parsing
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
      var daysToAdd = (targetDay - currentDay + 7) % 7 || 7; // Next occurrence
      today.setDate(today.getDate() + daysToAdd);
      return today;
    }
  } 
  else {
    // "28th February 2025" or "February 28, 2025"
    return new Date(dateStr.replace(/(st|nd|rd|th)/i, ""));
  }
}

// Improved time parsing
function parseRefinedTime(timeStr, date) {
  timeStr = timeStr.toLowerCase();
  var hours, minutes = 0;
  
  if (timeStr.includes("h")) {
    // e.g., "15h30"
    var [hourPart, minPart] = timeStr.split("h");
    hours = parseInt(hourPart);
    minutes = parseInt(minPart);
  } 
  else if (timeStr.includes(":")) {
    // e.g., "15:30" or "3:00 PM"
    var [hourPart, minPart] = timeStr.split(":");
    hours = parseInt(hourPart);
    minutes = parseInt(minPart.replace(/am|pm/, ""));
  } 
  else {
    // e.g., "3 PM"
    hours = parseInt(timeStr.replace(/am|pm/, ""));
    minutes = 0;
  }
  
  if (timeStr.includes("pm") && hours < 12) hours += 12;
  if (timeStr.includes("am") && hours === 12) hours = 0;
  
  var eventDateTime = new Date(date);
  eventDateTime.setHours(hours, minutes, 0, 0);
  return eventDateTime;
}
