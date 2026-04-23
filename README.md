# Resume Genie ATS Compliance System

Resume Genie is an ATS Compliance System built to evaluate and optimize resumes against specific job descriptions. 

## Overview

The application utilizes Google's Gemini 2.5 Flash model to perform fast, high-accuracy analysis. Users supply a job description and their resume, which can be provided in one of three formats:
* An attached PDF document
* Raw LaTeX code
* Plain text

## Analysis Process

Upon submission, the application securely passes the resume and job description to the Gemini 2.5 Flash API. If a PDF is attached, the system leverages Gemini's native multimodal capabilities to analyze the document directly via the `inlineData` API, eliminating the need for intermediary text extraction. The model acts as an expert technical recruiter, employing natural language processing to identify semantic matches, root-word alignments, and contextual gaps between the candidate's experience and the role's requirements.

## Results Display

The API response is parsed and rendered into a structured dashboard consisting of:
* **Match Score:** A quantitative metric indicating overall alignment.
* **Optimization Summary:** Actionable advice detailing primary areas for improvement.
* **Missing Keywords:** Specific skills or qualifications required by the job but not found in the resume.
* **Matched Keywords:** Skills successfully identified in both documents.

## Interactive Refinement

The results panel includes a persistent chat interface powered by Gemini. The chat automatically inherits the context of the user's resume, the job description, and the latest analysis results via system instructions. This allows the user to query the model for granular advice or specific rewrites based on the existing analysis.
