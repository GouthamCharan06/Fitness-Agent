Fitness Agent – Secure Multi-Agent Fitness Assistant

Project Description:
Fitness Agent is a secure multi-agent system built for the Descope Global MCP Hackathon (Theme 3 – Advanced: Design How Agents Talk, Trust, and Team Up).
The project empowers fitness beginners and health-conscious individuals by providing personalized training, nutrition, and recovery guidance, while ensuring secure agent-to-agent communication using Descope JWTs and scoped permissions.
This solution not only simulates real-world agent workflows but also showcases how autonomous agents can collaborate securely across trust boundaries.

Team Details: 
1. Team Name: Confickers
2. Member: Arasada Goutham Charan

Hackathon Theme:
1. Theme 3 (Advanced): Design How Agents Talk, Trust, and Team Up, Built to demonstrate secure, scoped, multi-agent collaboration with Descope Inbound Apps

What I Built:
1. A Next.js frontend for user login, consent capture, and chat-based interaction.
2. A FastAPI orchestrator that routes user queries to specialized agents.
Four specialized agents:
1. Trainer Agent : Gives workout recommendations, training plans and responds to training related queries
2. Nutrition Agent : Gives Dietary recommendations, dietplans and responds to nutrition related queries
3. Recovery Agent : Gives recovery advice + integration with Fitbit API for real-time suggestions
4. Orchestrator Agent : validates JWT + scopes, classifies intent, and coordinates communication between agents.

3. Descope JWT + scopes ensure secure agent communication (agents only act within delegated permissions). If no JWT, it returns an Unauthorized message to the user
4. Fitbit API integration (sleep + activity data). Since no physical device was available, data was manually logged into Fitbit to demonstrate agent–API interaction.

How this Solution Differs from Existing Fitness Apps?
1. Most current AI fitness apps are single chatbots, they provide workouts, diet tips, or sleep advice in isolation. They lack coordination, secure communication, and cannot integrate external health data effectively.
2. Our solution introduces a multi-agent system where Trainer, Nutrition, and Recovery agents collaborate securely using Descope-issued JWTs with scoped permissions. User consent is captured upfront, and sensitive data (like Fitbit sleep and activity logs) is accessed only within authorized scopes.
3. This creates a trustworthy, extensible, and future-ready platform that guides beginners, supports advanced users, and can scale to integrate medical reports, heart rate trends, or insurance-linked wellness insights.

Key Strengths:
1. Multi-Agent Collaboration: Secure orchestration of Trainer, Nutrition, and Recovery agents.
2. User Consent & Scoped Access: Sensitive health data is accessed only with explicit consent and proper authorization.
3. Integration of External Data: Supports Fitbit and manual input for personalized recommendations.
4. Scalable & Extensible: Can incorporate advanced use cases like medical or insurance data in the future.

How to Run?
1. Clone the Repository : git clone <repo-link>
2. cd frontend/fitness-agent-frontend

Set up Environment Variables: Copy .env.example to .env

Add required keys:
1. DESCOPE_PROJECT_ID, and related DESCOPE Keys
2. OPENAI_API_KEY
3. FITBIT_CLIENT_ID and related FITBIT Keys

Install Dependencies:
1. Backend:
pip install -r requirements.txt
uvicorn backend.main:app --reload

2. Frontend:
cd frontend/fitness-agent-frontend
npm install
npm run dev

Run Application:
After executing npm run dev,
1. Open http://localhost:3000
2. Log in via Descope and provide consent (one-time).
3. Start querying agents:
“Give me a workout and diet plan” : Invokes Trainer + Nutrition,
“How is my Recovery today?” : Invokes Recovery agent (Choose between Fitbit and Manual entry for response),
“Suggest recovery tips” : Invokes Trainer + Nutrition + Recovery Agents.

Tech Stack:
1. Frontend: Next.js, TailwindCSS
2. Backend: FastAPI (Python)
3. Agents: LangChain-based modular agents + LangGraph
4. Identity & Security: Descope (JWT, Scopes, OAuth-based trust, Magic Link Authentication)
5. External API: Fitbit Web API (sleep & activity data)

Deployment: 
1. Frontend: Vercel
2. Backend: Render

Deployed URL : https://fitness-agent-ecru.vercel.app/

Demo Video:
1. YouTube Link: https://www.youtube.com/watch?v=ECXrBODhv-s

Future Enhancements:
1. Upload medical reports to generate personalized training + nutrition plans.
2. Extend Fitbit integration with detailed sleep logs, heart rate trends, and more.
3. Enable chat history–based responses for better continuity.
4. Build custom agent clients for external integrations.







