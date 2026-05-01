# MASTER PLAN: Kids Lucky Draw System

## 1. CORE REQUIREMENTS

### 1.1 System Purpose
A simple, engaging behavior reinforcement system where teachers can award points to kids, and each point represents an extra chance to win in a lucky draw.

### 1.2 Key Features
1. **Name Entry Point**: Easy way to add kids names to the system
2. **Clickable Points**: Simple +1 button for good behavior
3. **Chance System**: Each point = one extra chance to win
4. **Random Draw**: Spin mechanism to randomly select a winner

## 2. SYSTEM OVERVIEW

### 2.1 Core Concept
A simple desktop application where teachers can manage kids names, award behavior points with one-click buttons, and run lucky draws where each point equals one chance to win.

### 2.2 Target Audience
- **Primary Users**: Teacher (single classroom)
- **Secondary Users**: Kids (ages 5-11)

### 2.3 Key Features
- Simple name entry for adding kids
- One-click point awarding (+1 per good behavior)
- Point-to-chance conversion (1 point = 1 chance)
- Random winner selection via spin mechanism

## 3. TECHNICAL ARCHITECTURE

### 3.1 Platform Requirements
- **Deployment**: Local desktop application (no internet required)
- **Operating System**: Windows, macOS, Linux compatibility
- **Hardware**: Standard classroom computer

### 3.2 Technology Stack
- **Recommended**: Python + Tkinter (simple, cross-platform)
- **Alternative**: Electron (web-based desktop app)

### 3.3 Data Structure
```python
# Kids storage
{
    "kids": [
        {"name": "Emma", "points": 5},
        {"name": "Liam", "points": 3},
        {"name": "Sophia", "points": 7}
    ]
}

# Daily draw results
{
    "date": "2026-04-18",
    "winner": "Sophia",
    "total_entries": 15
}
```

## 4. IMPLEMENTATION ROADMAP

### Phase 1: Core System (Week 1-2)
- [ ] **Name Entry**: Simple interface to add kids names
- [ ] **Point System**: Clickable +1 buttons for each kid
- [ ] **Display**: Show kids and their current points
- [ ] **Basic Draw**: Simple random selection

### Phase 2: Enhanced Features (Week 3-4)
- [ ] **Spin Animation**: Visual spinning wheel for draw
- [ ] **Data Persistence**: Save kids and points between sessions
- [ ] **Reset Option**: Clear points for new day
- [ ] **Export Results**: Save draw history

### Phase 3: Polish & Optimization (Week 5-6)
- [ ] **UI Improvements**: Better visual design
- [ ] **Error Handling**: Robust input validation
- [ ] **Performance**: Fast response times
- [ ] **Testing**: Real-world usage testing

## 5. CORE FEATURES DETAIL

### 5.1 Name Entry System
- **Simple Input**: Text field to add new kids names
- **List Display**: Show all kids in the classroom
- **Edit/Delete**: Remove or modify kid names
- **Persistent Storage**: Names saved between sessions

### 5.2 Point Awarding System
- **One-Click +1**: Simple button for each kid to add 1 point
- **Visual Feedback**: Immediate update of point totals
- **Per-Kid Buttons**: Individual point buttons for each student
- **No Limits**: No maximum points per day (simple approach)

### 5.3 Chance Calculation
- **Direct Conversion**: 1 point = 1 chance in the draw
- **Total Entries**: Sum of all points = total chances
- **Weighted Random**: Higher points = better odds
- **Display Odds**: Show current chances for each kid

### 5.4 Lucky Draw System
- **Spin Button**: Large button to start the draw
- **Random Selection**: Fair random winner based on points
- **Visual Result**: Display the winning kid's name
- **Reset Option**: Clear points for next day's draw

## 6. USER EXPERIENCE

### 6.1 Teacher Workflow
1. **Add Kids**: Enter all student names at start of year
2. **Award Points**: Click +1 button when kids behave well
3. **Track Progress**: Watch point totals accumulate
4. **Run Draw**: Click spin button at end of day
5. **Announce Winner**: Display winning kid's name

### 6.2 Kid Experience
1. **See Points**: Watch their point total grow
2. **Understand Chances**: Know more points = better odds
3. **Get Excited**: Anticipate the daily draw
4. **Celebrate Winner**: Enjoy the recognition

## 7. DAILY WORKFLOW

### Morning Setup
1. Open the application
2. Review current kids list (add any new students)
3. Prepare for day's behavior tracking

### During Class
1. Observe positive behavior
2. Click +1 button next to student's name
3. Point total updates immediately
4. Repeat throughout the day

### End of Day Draw
1. Gather students around
2. Click the SPIN button
3. Watch random selection
4. Announce winning student
5. Celebrate and reset for next day (optional)

## 8. DATA & STORAGE

### 8.1 Simple Data Structure
- **Kids Names**: Stored in text file or simple database
- **Point Totals**: Updated in real-time, saved persistently
- **Draw History**: Track winners and dates
- **No Complexity**: Simple key-value storage

### 8.2 File Format
```python
# kids.json
{
    "kids": [
        {"name": "Emma", "points": 5},
        {"name": "Liam", "points": 3}
    ],
    "history": [
        {"date": "2026-04-18", "winner": "Sophia"}
    ]
}
```

### 8.3 Backup & Recovery
- **Manual Export**: Save data to external file
- **Simple Restore**: Load from backup file
- **No Complexity**: User-friendly backup process

## 9. SUCCESS MEASURES

### 9.1 Simple Metrics
- **Daily Usage**: System used every school day
- **Kid Participation**: All kids engaged and excited
- **Teacher Satisfaction**: Easy to use and effective
- **Behavior Improvement**: Observable positive changes

### 9.2 Feedback Loops
- **Weekly Check-ins**: Teacher feedback on system
- **Kid Reactions**: Observe engagement and excitement
- **Simple Adjustments**: Make changes based on feedback

---

**Document Version**: 2.0
**Created**: April 16, 2026
**Last Updated**: April 18, 2026
**Status**: Consolidated - Ready for Implementation