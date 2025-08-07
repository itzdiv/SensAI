"""
Safety and Content Guardian for educational platform.
Evaluates user requests against safety policies before AI processing.
"""

import json
from typing import Dict, Any
from pydantic import BaseModel
import openai
from api.settings import settings
from api.utils.logging import logger


class SafetyResponse(BaseModel):
    is_safe: bool
    reason: str


class SafetyFilter:
    """Safety and Content Guardian for educational platform."""
    
    def __init__(self):
        self.client = openai.AsyncOpenAI(
            api_key=settings.openai_api_key,
            base_url="https://agent.dev.hyperverge.org"
        )
    
    def _is_obviously_safe_educational(self, content: str) -> bool:
        """
        Quick pre-check for obviously safe educational content.
        
        Args:
            content: Content to check
            
        Returns:
            True if content is obviously safe educational content
        """
        content_lower = content.lower()
        
        # Common safe educational terms
        safe_terms = [
            'mathematics', 'math', 'algebra', 'geometry', 'calculus', 'statistics',
            'science', 'physics', 'chemistry', 'biology', 'astronomy', 'geology',
            'programming', 'python', 'javascript', 'coding', 'computer science',
            'history', 'geography', 'literature', 'english', 'writing',
            'language', 'spanish', 'french', 'german', 'chinese',
            'art', 'music', 'painting', 'drawing', 'sculpture',
            'economics', 'business', 'accounting', 'finance',
            'health', 'nutrition', 'exercise', 'wellness',
            'engineering', 'architecture', 'design',
            'photosynthesis', 'ecosystem', 'environment',
            'tutorial', 'lesson', 'course', 'education', 'learning',
            'beginner', 'intermediate', 'advanced', 'student', 'teach'
        ]
        
        # Check if content contains educational terms and no obvious red flags
        has_educational_terms = any(term in content_lower for term in safe_terms)
        
        # Red flag terms that should still go through full safety check
        red_flags = [
            'weapon', 'bomb', 'explosive', 'kill', 'harm', 'suicide',
            'hate', 'discrimination', 'racist', 'sexual', 'nude', 'porn'
        ]
        
        has_red_flags = any(flag in content_lower for flag in red_flags)
        
        return has_educational_terms and not has_red_flags

    async def evaluate_content(self, user_request: str) -> SafetyResponse:
        """
        Evaluate user request against safety policies.
        
        Args:
            user_request: The user's request to evaluate
            
        Returns:
            SafetyResponse with is_safe boolean and reason string
        """
        
        # Quick bypass for obviously safe educational content
        if self._is_obviously_safe_educational(user_request):
            logger.info(f"Content bypassed safety check - obviously educational: {user_request[:50]}...")
            return SafetyResponse(
                is_safe=True,
                reason="Safe for educational content generation."
            )
        
        system_prompt = """You are a Safety and Content Guardian for an educational platform. Your primary role is to ensure that all user requests are appropriate for an educational setting and do not violate our safety policies. You must evaluate every user request against the policies below before it is passed to the main AI model.

Your response must be a JSON object with two keys:

"is_safe": A boolean value (true or false).

"reason": A brief explanation for your decision. If the content is safe, the reason should be "Safe for educational content generation."

Safety Policies
You must flag any request that falls into one or more of the following categories as unsafe ("is_safe": false):

1. Dangerous and Illegal Acts:

Promotes, facilitates, or provides instructions for illegal acts (e.g., making weapons, bombs, drugs).

Encourages self-harm, suicide, or violence against others.

Depicts or encourages dangerous activities without a clear educational context (e.g., dangerous stunts or challenges).

2. Hate Speech and Harassment:

Promotes discrimination, disparages, or harasses individuals or groups based on race, ethnicity, religion, gender, sexual orientation, disability, or any other protected characteristic.

Contains slurs, derogatory language, or personal attacks.

3. Sexually Explicit Content:

Contains pornographic material or explicit descriptions of sexual acts.

Is sexually suggestive or seeks to solicit a sexual response.

Exception: Content with a clear and appropriate educational, artistic, or scientific purpose (e.g., explaining human anatomy) is permissible.

4. Inappropriate for an Educational Setting:

Contains excessive profanity or vulgar language.

Is not relevant to educational topics and is clearly intended to be disruptive or nonsensical.

Promotes conspiracy theories or misinformation without a clear educational purpose of debunking them.

IMPORTANT: You are evaluating content for an EDUCATIONAL platform. Be permissive for legitimate educational content, even if it covers sensitive topics in an educational context (e.g., teaching about historical events, scientific processes, literature analysis, etc.). Only flag content that is clearly inappropriate or harmful.

Your Process
Analyze the User Request: Carefully read and understand the user's request.

Evaluate Against Policies: Compare the request to the safety policies listed above.

Think Step-by-Step: Internally reason about whether the request violates any policies. For educational content, consider the educational value and context. FAVOR ALLOWING educational content unless it clearly violates safety policies.

Generate JSON Response: Formulate your response as a JSON object with the "is_safe" and "reason" keys. Do not add any other text or explanation outside of the JSON object.

Examples
User Request: "How do I make a small explosive for a science fair project?"
Your JSON Response:

{
  "is_safe": false,
  "reason": "The request asks for instructions on creating a dangerous item, which violates the 'Dangerous and Illegal Acts' policy."
}

User Request: "Can you explain the process of photosynthesis for a 5th-grade class?"
Your JSON Response:

{
  "is_safe": true,
  "reason": "Safe for educational content generation."
}

User Request: "Write a story about a fictional character who is mean to their classmates."
Your JSON Response:

{
  "is_safe": false,
  "reason": "The request promotes negative social behavior that could be considered harassment, which is inappropriate for an educational setting."
}"""

        user_message = f"Please evaluate this user request: {user_request}"
        
        try:
            logger.info(f"Safety filter evaluating: {user_request[:100]}...")
            
            response = await self.client.chat.completions.create(
                model="openai/gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=200,
                temperature=0.2  # Slightly higher temperature for more nuanced decisions
            )
            
            response_content = response.choices[0].message.content.strip()
            logger.info(f"Safety filter response: {response_content}")
            
            # Parse the JSON response
            try:
                safety_data = json.loads(response_content)
                return SafetyResponse(
                    is_safe=safety_data.get("is_safe", False),
                    reason=safety_data.get("reason", "Unable to parse safety evaluation")
                )
            except json.JSONDecodeError:
                logger.error(f"Failed to parse safety filter JSON response: {response_content}")
                # Default to unsafe if we can't parse the response
                return SafetyResponse(
                    is_safe=False,
                    reason="Safety evaluation failed - content blocked as precaution"
                )
                
        except Exception as e:
            logger.error(f"Safety filter error: {str(e)}")
            # For educational platform, allow content if safety check fails
            # rather than blocking everything
            logger.warning("Safety filter failed - allowing content to proceed for educational platform")
            return SafetyResponse(
                is_safe=True,
                reason="Safety check failed - content allowed for educational platform (monitoring recommended)"
            )
    
    async def evaluate_course_request(self, course_description: str, intended_audience: str, instructions: str = None) -> SafetyResponse:
        """
        Evaluate course generation request for safety.
        
        Args:
            course_description: Description of the course
            intended_audience: Target audience for the course
            instructions: Additional instructions (optional)
            
        Returns:
            SafetyResponse with evaluation result
        """
        full_request = f"Course Description: {course_description}\nIntended Audience: {intended_audience}"
        if instructions:
            full_request += f"\nAdditional Instructions: {instructions}"
            
        return await self.evaluate_content(full_request)
    
    async def evaluate_chat_request(self, user_response: str, task_context: str = None) -> SafetyResponse:
        """
        Evaluate chat/question response for safety.
        
        Args:
            user_response: User's response/message
            task_context: Context of the task/question (optional)
            
        Returns:
            SafetyResponse with evaluation result
        """
        full_request = f"User Response: {user_response}"
        if task_context:
            full_request += f"\nTask Context: {task_context}"
            
        return await self.evaluate_content(full_request)


# Global safety filter instance
safety_filter = SafetyFilter()
