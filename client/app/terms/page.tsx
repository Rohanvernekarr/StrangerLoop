import React from "react";

const TermsPage = () => (
  <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-12 flex flex-col items-center">
    <section className="max-w-3xl w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl shadow-2xl p-10">
      <h1 className="text-3xl font-extrabold mb-4 text-zinc-100 tracking-tight border-b border-zinc-800 pb-2">
        Terms of Service
      </h1>
      <p className="text-zinc-400 text-md mb-4">
        Welcome to StrangerLoop. Please read these terms carefully before using our service.
      </p>

      <div className="space-y-8">
       
        <div>
          <h2 className="font-semibold text-base text-zinc-200 mb-1">1. Use of Service</h2>
          <p className="text-zinc-400 text-[15px]">
            StrangerLoop allows users to connect randomly for chat and video. By using this platform, you agree to communicate respectfully with others.
          </p>
        </div>
       
        <div>
          <h2 className="font-semibold text-base text-zinc-200 mb-1">2. User Conduct</h2>
          <p className="text-zinc-400 text-[15px]">
            Harassment, bullying, and inappropriate behavior are strictly prohibited. Violations can result in a permanent ban from the service.
          </p>
        </div>
       
        <div>
          <h2 className="font-semibold text-base text-zinc-200 mb-1">3. Privacy</h2>
          <p className="text-zinc-400 text-[15px]">
            StrangerLoop does not record or store video calls. For moderation, chat logs and session data may be temporarily retained.
          </p>
        </div>
       
        <div>
          <h2 className="font-semibold text-base text-zinc-200 mb-1">4. Eligibility</h2>
          <p className="text-zinc-400 text-[15px]">
            Users must be at least 18 years old or have parental/guardian consent to access the service.
          </p>
        </div>
     
        <div>
          <h2 className="font-semibold text-base text-zinc-200 mb-1">5. Liability</h2>
          <p className="text-zinc-400 text-[15px]">
            The service is provided as-is, without warranties. Use at your own risk; StrangerLoop cannot be held liable for user interactions.
          </p>
        </div>
       
        <div>
          <h2 className="font-semibold text-base text-zinc-200 mb-1">6. Updates to Terms</h2>
          <p className="text-zinc-400 text-[15px]">
            Terms may change at any time. By continuing to use the service, you agree to the latest version of these terms.
          </p>
        </div>
      </div>

      <div className="mt-10 text-zinc-500 text-xs text-right">
        Last updated: November 2025
      </div>
    </section>
  </main>
);

export default TermsPage;
