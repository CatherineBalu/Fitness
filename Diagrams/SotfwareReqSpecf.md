## Text specifications of other use cases

### <ins>Basic version</ins>

#### 1. Register account
UC1 allows a visitor to create a personal account; the system creates a record in the database and sends an automated confirmation email.

#### 2. User authentication
UC2 allows users to log into the system using hashed credentials or OAuth providers; the system manages access permissions for Clients, Employees, and Admins.

#### 3. Reset password
UC3 allows a user to request a password reset via a secure link sent to their registered email address.

#### 4. Purchase membership
UC4 allows a customer to select and pay for a subscription; FitnessApp updates their validity in the database and records the payment history.

#### 5. View gym schedule
UC5 allows customers and staff to view an interactive calendar of upcoming lectures, including room availability and instructor details.

#### 6. Register for lecture
UC6 allows a customer with an active membership to book a spot in a specific lecture, provided the room capacity is not reached.

#### 7. Unregister from lecture
UC7 allows a customer to cancel their booking at least 24 hours before the lecture begins to free up the spot for other members.

#### 8. Update contact information
UC8 allows users to change their personal details, such as phone number or email, and view their current subscription status.

#### 9. Manage lectures
UC9 allows employees to create, modify, or remove gym lectures and assign them to specific time slots in the schedule.

#### 10. Manage customer database
UC10 allows employees to search for clients and manually edit their profile information or membership status in the back-office.

#### 11. Track attendance
UC11 allows employees to view the list of participants for a specific lecture and mark their actual attendance.

#### 12. Manage staff members
UC12 allows the admin to create and manage employee accounts, define their roles, and track hire dates.

### <ins>Advanced version</ins>

#### 13. System analytics
UC13 allows the administrator to view advanced business metrics

#### 14. Lecture newsletter
UC14 automatically notifies subscribed customers via email whenever a new lecture or a special training event is added to the schedule.

#### 15. Upcoming lecture reminder
UC15 sends an automated notification to the customer shortly before their registered lecture begins to minimize "no-shows".

#### 16. Security notifications
UC16 triggers an alert to the user's registered email whenever their password or sensitive personal information is modified.

#### 17. Personal training statistics
UC17 allows customers to view their workout history, frequency of visits, and progress charts based on their attendance.

#### 18. Interface theme customization
UC18 allows the user to toggle between Light and Dark mode using the shadcn-based UI components for a personalized visual experience.

#### 19. Exercise category creation
UC19 allows employees (trainers) to create new exercise types (e.g., Pilates, HIIT) to reflect new training programs offered by the gym.
[START of admin stuff]
#### 20. Employee lifecycle management
UC20 allows the admin to create new employee records, assign them to a person in the database, and define their specific job roles.

#### 21. Subscription plan configuration
UC21 allows the admin to modify the membership types, including changing prices, plan names, and the duration of valid subscriptions.

#### 22. Gym room management
UC22 allows the admin to add, rename, or modify the capacity of workout rooms in the TB_room table to reflect the physical gym layout.

#### 23. Exercise category management
UC23 allows the admin to manage the list of available exercise types (e.g., Yoga, HIIT, Crossfit) used to categorize gym lectures.

#### 24. System audit logs
UC24 allows the admin to view a history of critical system changes made by employees to ensure accountability and data integrity.

#### 25. Master data cleanup
UC25 allows the admin to edit or delete exercise categories and archive old schedule records to maintain database consistency.
[End of admin stuff]




## Non-functional requirements

### <ins>System Quality & Technical Specifications</ins>

#### 1. Responsive web design
NFR1 ensures the user interface is fully responsive and optimized for mobile, tablet, and desktop devices using shadcn/ui components and Tailwind CSS.

#### 2. Dark mode support
NFR2 provides a consistent visual experience in both Light and Dark modes, allowing users to switch between themes.

#### 3. Data security and hashing
NFR3 requires all user passwords to be hashed using a strong cryptographic algorithm before being stored in the TB_person table.

#### 4. Authentication and Authorization
NFR4 ensures that system access is strictly controlled based on user roles (Admin, Employee, Customer), preventing unauthorized access to back-office sensitive data.

#### 5. Database integrity
NFR5 maintains strict data consistency using foreign key constraints and transaction management as defined in the database schema.

#### 6. System performance
NFR6 guarantees that the gym schedule and reservation actions load within 2 seconds under normal network conditions to ensure a smooth user experience.

#### 7. Automated testing
NFR7 requires the implementation of unit and integration tests for critical business logic, such as membership validation and lecture booking.

#### 8. GDPR compliance
NFR8 ensures that all personal data, including email addresses and phone numbers, are handled and stored in accordance with personal data protection regulations.

#### 9. Scalability
NFR9 ensures the system architecture is designed to handle an increasing number of customers and reservations without significant performance degradation.

#### 10. Localization and Multi-language support
NFR10 ensures the application can be toggled between Czech and English languages, providing localized labels and system messages for all users.