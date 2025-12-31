# Complete Qualtrics Survey: I'm Cooked - AI Cooking Assistant Evaluation

## Survey Metadata
- Survey Name: ImCooked_AI_Cooking_Assistant_Study
- Estimated Time: 5-7 minutes
- Total Questions: 22 items
- Platform: Qualtrics
- Target Audience: Users who have tried the I'm Cooked cooking assistant application

---

## SURVEY FLOW

---

### BLOCK 1: WELCOME & CONSENT

# I'm Cooked AI Cooking Assistant Study - Survey

Welcome and thank you for participating!

This survey is part of a research study evaluating the I'm Cooked AI-powered cooking assistant application.

Purpose: We are evaluating user experience with our voice-guided cooking assistant to understand whether it successfully helps beginner cooks feel more confident in the kitchen and better manage the various tasks involved in cooking.

What this survey involves:
- You will answer questions about your experience using the I'm Cooked application
- The survey takes approximately 5-7 minutes to complete
- All questions are based on your recent experience with the app

Your rights:
- Your participation is completely voluntary
- You may skip any question you're uncomfortable answering
- You may exit the survey at any time
- There are no consequences for not completing the survey

Confidentiality & Data Use:
- Your responses are anonymous - no personal identifying information is collected
- Data will be used solely for research and product improvement purposes
- Results will be reported in aggregate form only
- Raw data will be stored securely and used only by the research team
- Your individual responses will not be shared with third parties

Important Note:
This application provides cooking guidance and is not a substitute for professional culinary training or food safety certification. For food safety questions, please consult official resources like the USDA Food Safety and Inspection Service.

By clicking "Next" below, you indicate that:
- You have read and understood this information
- You consent to participate in this survey
- You understand your responses will be used for research purposes
- You are at least 18 years old

If you have questions about this research, please contact:
Research Team: Tan Yuanzheng [Telegram: @YZTangent] 

---

### BLOCK 2: DEMOGRAPHICS & COOKING BACKGROUND

## About You and Your Cooking Experience

We'd like to understand your background with cooking and technology to help us interpret your feedback.

#### Q1: Cooking Experience Level
Type: Multiple Choice (Single Answer)

Question Text:
How would you describe your cooking experience level?

Response Options:
-  Beginner - I'm new to cooking and still learning the basics
-  Novice - I can follow simple recipes but lack confidence with complex dishes
-  Intermediate - I'm comfortable cooking regularly and can handle most recipes
-  Advanced - I'm an experienced home cook who often experiments and adapts recipes
-  Expert - I have professional training or extensive cooking experience

Settings:
- Force Response: Yes

---

#### Q2: Cooking App Experience
Type: Multiple Choice (Single Answer)

Question Text:
Before using I'm Cooked, how often had you used cooking apps or digital recipe assistants?

Response Options:
-  Never - I'm Cooked was my first cooking app
-  Rarely - Once or twice before
-  Occasionally - A few times (3-10 times)
-  Frequently - I regularly use cooking apps (10+ times)
-  Very Frequently - I use cooking apps almost every time I cook

Settings:
- Force Response: Yes

---

#### Q3: Cooking Frequency
Type: Multiple Choice (Single Answer)

Question Text:
How often do you typically cook meals at home?

Response Options:
- Rarely - Less than once a week
- Occasionally - 1-2 times per week
- Regularly - 3-4 times per week
- Frequently - 5-6 times per week
- Daily - 7 or more times per week

Settings:
- Force Response: Yes

---

### BLOCK 3: FEATURE USAGE CHECK

[Instruction Text]

The following question helps us understand which features of I'm Cooked you experienced during your use.

#### Q4: Features Used
Type: Multiple Choice (Multiple Answer - Checkboxes)

Question Text:
Which of the following features did you use during your experience with I'm Cooked?

*(Please select all that apply)*

Response Options:
Recipe search and discovery
Voice-guided cooking instructions (hands-free mode)
Timer management (setting/tracking cooking timers)
Ingredient substitution suggestions
Allergen filtering or dietary restriction settings
Serving size adjustments
Voice-activated questions to the AI assistant (asking for help while cooking)
Step navigation (next step, previous step, repeat)
Recipe customization
Other (please specify)

Settings:
- Force Response: Yes
- Allow "Other" with text entry

---

### BLOCK 4: CONFIDENCE & SKILL DEVELOPMENT

[Instruction Text]

The following questions ask about how I'm Cooked affected your confidence and comfort while cooking.

One of our primary goals is to help beginner cooks feel more confident in the kitchen. Please rate your agreement with each statement based on your experience.

#### Q5-Q10: Confidence & Skill Development Items
Type: Matrix Table

Question Text:
Please indicate your level of agreement with each statement about your experience using I'm Cooked:

Column Headers (Scale Points):
- 1 - Strongly Disagree
- 2 - Disagree
- 3 - Somewhat Disagree
- 4 - Neither Agree nor Disagree
- 5 - Somewhat Agree
- 6 - Agree
- 7 - Strongly Agree

Row Items:

1. I felt more confident in my cooking abilities while using I'm Cooked.
2. I felt capable of handling multiple cooking tasks at the same time.
3. I experienced less stress and felt less overwhelmed while cooking with I'm Cooked.
4. I'm Cooked made me more willing to try new or unfamiliar recipes.
5. I gained a better understanding of cooking techniques through using I'm Cooked.
6. I felt more independent and in control while cooking with the app's assistance.

Settings:
- Force Response: Yes
- Display as: Matrix table with radio buttons
- Randomize row order: No

Qualtrics Implementation:
```
Create as single Matrix question with 6 rows and 7 columns (1-7 scale)
```

---

### BLOCK 5: MULTITASKING & COGNITIVE LOAD

[Instruction Text]

A key goal of I'm Cooked is to help users "juggle the various parts of cooking" more effectively. The following questions ask about how well the app supported you in managing multiple cooking tasks.

#### Q11-Q14: Multitasking & Cognitive Load Items
Type: Matrix Table

Question Text:
Please indicate your level of agreement with each statement about managing cooking tasks:

Column Headers (Scale Points):
- 1 - Strongly Disagree
- 2 - Disagree
- 3 - Somewhat Disagree
- 4 - Neither Agree nor Disagree
- 5 - Somewhat Agree
- 6 - Agree
- 7 - Strongly Agree

Row Items:

1. I'm Cooked helped me manage multiple cooking steps happening at the same time.
2. The timer management features made it easier to track different cooking tasks.
3. I'm Cooked reduced the mental effort required to keep track of what I was doing.
4. The app supported my own natural cooking pace and workflow.

Settings:
- Force Response: Yes
- Display as: Matrix table with radio buttons
- Randomize row order: No

---

### BLOCK 6: AI ASSISTANT TRUST & ACCURACY

[Instruction Text]

The following questions ask about your perceptions of the AI cooking assistant's reliability, accuracy, and whether it had your best interests in mind.

#### Q15-Q22: AI Assistant Trust & Accuracy
Type: Matrix Table

Question Text:
Please indicate your level of agreement with each statement about the AI cooking assistant:

Column Headers (Scale Points):
- 1 - Strongly Disagree
- 2 - Disagree
- 3 - Somewhat Disagree
- 4 - Neither Agree nor Disagree
- 5 - Somewhat Agree
- 6 - Agree
- 7 - Strongly Agree

Row Items:

[Competence Dimension - Perceived Expertise/Ability]
1. The AI assistant seemed knowledgeable about cooking techniques and recipes.
2. The AI assistant provided accurate cooking information and instructions.
3. The ingredient substitution suggestions were helpful and appropriate.
4. The AI assistant appeared competent in guiding me through cooking tasks.

[Benevolence Dimension - Perceived Good Intentions/Safety]
5. The AI assistant seemed to have my best interests at heart (e.g., safety, dietary needs).
6. The allergen protection and dietary restriction features made me feel the app cared about my wellbeing.
7. The AI assistant's recommendations seemed to prioritize my needs and preferences.
8. I trusted that the AI assistant would provide safe and reliable cooking guidance.

Settings:
- Force Response: Yes
- Display as: Matrix table with radio buttons
- Randomize row order: No (preserve dimension structure)

Qualtrics Implementation Note:
```
Can be implemented as:
- Single Matrix question with 8 rows and 7 columns
OR
- Two separate Matrix questions:
  * Competence (4 items)
  * Benevolence/Safety (4 items)
```

Theoretical Rationale:
These items measure the two core dimensions of trust adapted for a cooking assistant context:
- Competence/Ability: Perceived cooking knowledge, accuracy, and capability
- Benevolence/Safety: Perceived care for user wellbeing, especially around allergies and safety

---

### BLOCK 7: FEATURE-SPECIFIC EVALUATION

[Instruction Text]

Now we'd like to know about your experience with specific features of I'm Cooked.

Note: If you did not use a particular feature, please select "Did not use this feature."

#### Q23-Q27: Feature-Specific Evaluation
Type: Matrix Table

Question Text:
Please rate how helpful each of the following features was during your cooking experience:

Column Headers (Scale Points):
Not at all helpful
Slightly helpful
Somewhat helpful
Moderately helpful
Very helpful
Extremely helpful
N/A - Did not use this feature

Row Items:

1. Voice-guided instructions (hands-free cooking guidance)
2. Timer management system (setting and tracking multiple timers)
3. Ingredient substitution suggestions with detailed explanations
4. Allergen filtering and dietary restriction protection
5. Real-time Q&A with the AI assistant while cooking

Settings:
- Force Response: Yes
- Display as: Matrix table with radio buttons
- Include N/A option for each row

Qualtrics Implementation:
```
Create as Matrix question with 5 rows and 7 options (1-6 scale + N/A)
```

---

### BLOCK 8: BEHAVIORAL INTENTION

[Instruction Text]

Now we'd like to know about your intentions regarding using I'm Cooked in the future.

#### Q28-Q30: Behavioral Intention Items
Type: Matrix Table

Question Text:
Thinking about your experience, how likely would you be to do the following?

Column Headers (Scale Points):
 Very Unlikely
 Unlikely
 Somewhat Unlikely
 Neutral
 Somewhat Likely
 Likely
 Very Likely

Row Items:

1. I would use I'm Cooked again the next time I cook.
2. I would recommend I'm Cooked to a friend who is a beginner cook or wants help in the kitchen.
3. I intend to continue using I'm Cooked for my cooking needs going forward.

Settings:
- Force Response: Yes
- Display as: Matrix table with radio buttons
- Randomize row order: No

---

### BLOCK 9: OVERALL SATISFACTION & OPEN FEEDBACK

[Instruction Text]

Finally, we'd like to know your overall impressions and gather any additional feedback you'd like to share.

#### Q31: Overall Satisfaction
Type: Multiple Choice (Horizontal)

Question Text:
Please rate your agreement with the following statement:

"Overall, I was satisfied with my experience using I'm Cooked."

Response Options:
- 1 - Strongly Disagree
- 2 - Disagree
- 3 - Somewhat Disagree
- 4 - Neither Agree nor Disagree
- 5 - Somewhat Agree
- 6 - Agree
- 7 - Strongly Agree

Settings:
- Force Response: Yes
- Display as: Horizontal radio buttons or slider

---

#### Q32: Most Helpful Feature (Optional)
Type: Text Entry (Short Answer)

Question Text:
What was the MOST helpful feature or aspect of I'm Cooked for you?

*(This question is optional)*

Settings:
- Force Response: No
- Text Type: Single line text box
- Character limit: 500

---

#### Q33: Suggestions for Improvement (Optional)
Type: Text Entry (Essay)

Question Text:
What improvements or new features would make I'm Cooked more helpful for you?

*(This question is optional)*

Settings:
- Force Response: No
- Text Type: Essay box (multiple lines)
- Character limit: 1000

---

#### Q34: Additional Comments (Optional)
Type: Text Entry (Essay)

Question Text:
Is there anything else you'd like to share about your experience with I'm Cooked?

*(This question is optional - feel free to skip if you have nothing to add)*

Settings:
- Force Response: No
- Text Type: Essay box (multiple lines)
- Character limit: 1000

---

### BLOCK 10: CLOSING & THANK YOU

# Thank You for Completing the Survey!

Your responses have been recorded.

Your participation in this research is greatly appreciated. Your feedback will help us improve I'm Cooked and make it even more helpful for home cooks at all skill levels.

---

## What We're Learning

Your responses will help us understand:
- Whether I'm Cooked successfully builds confidence in beginner cooks
- How well the app helps users manage the complexity of cooking
- Which features are most valuable to users
- How we can improve the experience

---

## Stay Connected

If you'd like to stay updated on I'm Cooked's development or participate in future studies, please contact:
Research Team: [Your Contact Information]

---

## Questions About This Research?

If you have any questions about this study, please contact:

Researcher: [Your Name]
Email: [Your Email]
Project: I'm Cooked - AI Cooking Assistant

---

You may now close this window.

---

[End of Survey]

---
