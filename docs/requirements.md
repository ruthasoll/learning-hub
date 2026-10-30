Software Requirement Analysis
Project: Paid Online Learning Management System (LMS) for Pre-KG through Grade 12
These requirements reflect your decisions:
Instructors create course content, but administrators must approve and publish it.
Objective questions are graded automatically; written work is graded manually by instructors.
Administration is divided into a Platform Administrator role and a Finance/Payment Administrator role.
Pre-KG–Grade 4 uses teacher-guided learning.
Grades 5–12 primarily use self-paced learning, with optional live classes and teacher support.
Payment models remain open for research, so the system must support flexible pricing and enrollment rules.
1. System roles
The LMS will have five main user roles.
1. Platform Administrator
Platform control
Manages users, roles, academic structure, course approval, publishing, platform configuration, security, and system-wide reporting.
2. Finance/Payment Administrator
Financial operations
Manages pricing, payment records, refunds, reconciliation, discounts, and financial reports. This role cannot change grades or publish courses by default.
3. Instructor
Teaching and assessment
Creates course content, prepares assessments, grades written work, supports students, and monitors learning progress. Course publication requires approval.
4. Student
Purchases or receives authorized access to courses, studies lessons, attends applicable live classes, completes assessments, and views feedback.
5. Parent/Guardian
Manages or supervises a child's learning account as permitted, views progress and results, receives notifications, and accesses only linked children's information.
2. Updated instructor functional requirements
ID
Functional requirement
Expected behavior
INS-01
View assignments
Instructors can view the courses, subjects, and grade levels assigned to them.
INS-02
Create course content
Instructors can create courses, modules, lessons, videos, documents, and learning activities within their permissions.
INS-03
Submit for approval
Instructors can submit new or updated courses for administrator review.
INS-04
Track approval status
Instructors can see whether content is a draft, pending review, approved, rejected, or published.
INS-05
Edit returned content
Instructors can revise rejected content and resubmit it with reviewer feedback addressed.
INS-06
Create assessments
Instructors can create objective questions and written-response questions, set marks, define correct answers for objective questions, and establish grading criteria.
INS-07
Automatic grading
The system automatically grades supported objective questions, such as multiple-choice and true/false questions, according to configured answer keys.
INS-08
Manual grading
Instructors can review written answers, essays, projects, and other manually assessed submissions, then assign marks and feedback.
INS-09
Review results
Instructors can review assessment scores, student submissions, and course completion for assigned courses.
INS-10
Manage live sessions
Instructors can schedule and manage guided lessons for younger students and optional live sessions for Grades 5–12.
INS-11
Monitor learning
Instructors can identify overdue work, low assessment scores, and students who may need additional support.
INS-12
Record interventions
Instructors can record feedback, follow-up actions, and support provided to a student.
INS-13
Communicate
Instructors can send authorized announcements or messages to students and linked parents/guardians.
INS-14
Generate reports
Instructors can view and export permitted reports for their assigned courses.

3. Updated administrator functional requirements
A. Platform Administrator
ID
Functional requirement
Expected behavior
ADM-01
Manage users
Create, update, deactivate, and manage user accounts.
ADM-02
Manage roles
Assign and revoke instructor, finance administrator, student, and parent/guardian permissions.
ADM-03
Manage academic structure
Configure Pre-KG through Grade 12, subjects, courses, programs, and academic periods.
ADM-04
Assign instructors
Assign instructors to appropriate courses and grade levels.
ADM-05
Review course content
Inspect submitted courses and their learning materials before publication.
ADM-06
Approve or reject
Approve or reject submitted content and provide review comments.
ADM-07
Publish courses
Publish approved content and manage its visibility and availability.
ADM-08
Manage course delivery
Configure whether a course uses guided learning or self-paced learning, including live-session settings where applicable.
ADM-09
Monitor learning
View authorized student performance, course completion, and learning-support reports.
ADM-10
Manage parent links
Oversee parent/guardian account relationships and access permissions.
ADM-11
Configure notifications
Configure approved notification rules and communication templates.
ADM-12
Manage platform settings
Configure integrations, security policies, and general system settings.
ADM-13
Audit activity
Review audit records for important user, content, access, and configuration changes.
ADM-14
Manage operational reports
View platform-wide enrollment, course activity, and system performance reports.

B. Finance/Payment Administrator
ID
Functional requirement
Expected behavior
FIN-01
Manage pricing
Configure supported prices for courses, subscriptions, terms, and course bundles.
FIN-02
Manage discounts
Configure authorized discounts, coupons, and promotional offers.
FIN-03
View transactions
Search and filter payment records by date, student, course, provider, amount, and status.
FIN-04
Monitor payment status
Review pending, successful, failed, refunded, and disputed transactions where supported.
FIN-05
Reconcile payments
Compare LMS transaction records against provider settlement reports.
FIN-06
Manage refunds
Initiate or approve refunds according to defined financial permissions and policies.
FIN-07
Review enrollment payments
Investigate discrepancies between payment status and course access.
FIN-08
Manage financial access rules
Configure payment-related enrollment rules, subject to approved system policies.
FIN-09
Generate financial reports
View and export revenue, refunds, discounts, transaction, and settlement reports.
FIN-10
Audit financial actions
Record who changed pricing, initiated refunds, or modified financial settings and when.

4. Parent functional requirements
ID
Requirement
Expected behavior
PAR-01
Parent registration and login
Parents can create accounts, sign in, and manage their profiles securely.
PAR-02
Link child account
Parents can request to link their account to a child, subject to verification.
PAR-03
Manage multiple children
Parents with multiple children can switch between their linked children's profiles.
PAR-04
View learning dashboard
Parents can view their child's courses, progress, upcoming activities, and recent results.
PAR-05
Monitor academic performance
Parents can view assessment scores, assignment completion, teacher feedback, and progress trends.
PAR-06
Receive performance alerts
Parents receive notifications when their child meets defined criteria for needing academic support.
PAR-07
View attendance and participation
Parents can view recorded attendance for guided lessons and live sessions, along with learning activity where appropriate.
PAR-08
View assignments and deadlines
Parents can see upcoming assignments, overdue work, and completed activities.
PAR-09
View live-class schedules
Parents can view relevant class schedules and session information for their child.
PAR-10
Communicate with instructors
Parents can contact their child's assigned instructor through authorized messaging or communication channels.
PAR-11
View learning reports
Parents can view or download available progress reports and assessment summaries.
PAR-12
Manage payments
Parents can view relevant payments, receipts, course purchases, subscription status, and refund requests where supported.
PAR-13
Receive announcements
Parents receive relevant announcements about courses, schedules, and learning activities.
PAR-14
Manage notifications
Parents can manage notification preferences and supported delivery channels.
PAR-15
Protect child's privacy
Parents can access only the information and actions authorized for their verified linked children.

Parent Dashboard
Illustrative layout of the information available to a parent
Courses
Enrolled courses and lesson progress
Performance
Assessment results and progress trends
Activities
Deadlines, attendance, and live sessions
Notifications
Learning concerns and important updates

parents, and administrators.

Research area
Questions to answer
Existing platforms
Can Moodle, Open edX, or other LMS platforms support paid enrollment and different learning models by grade?
Learning experience
How should guided lessons for younger children differ from self-paced courses for older students?
Payments
Which payment providers support your target market, and how will paid enrollment be verified?
Live classes
Should the platform integrate with a video-conferencing service or provide built-in live classrooms?
Student performance
How will the system identify struggling students and notify parents?
Security
How will it protect children's data and restrict parents to their own children's records?
Technology
Which frontend, backend, database, hosting, and storage technologies are suitable?
Business model
Will users pay per course, per subject, per term, or through a subscription?
4. Proposed system modules
Your initial technical proposal can organize the LMS into these modules:
User and access management: students, parents, teachers, administrators.
Course catalog and enrollment: grades, subjects, course details, prices, and enrollment.
Payment management: payment verification, transaction records, refunds, and access control.
Learning management: lessons, videos, documents, assignments, and learning materials.
Live classes and teacher support: schedules, virtual classes, feedback, and messaging.
Assessment and grading: quizzes, exams, assignments, marks, and feedback.
Progress monitoring: course completion, assessment performance, and students needing support.
Parent notifications: learning concerns, assessment results, and progress updates.
Reporting and administration: enrollment, revenue, learning outcomes, and platform activity.




