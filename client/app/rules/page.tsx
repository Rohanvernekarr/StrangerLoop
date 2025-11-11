import React from "react";

const RulesPage = () => (
  <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-12 flex flex-col items-center">
    <section className="max-w-3xl w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl shadow-2xl p-10">
      <h1 className="text-3xl font-extrabold mb-4 text-zinc-100 tracking-tight border-b border-zinc-800 pb-2">
        Chat & Platform Rules
      </h1>
      <p className="text-zinc-400 text-md mb-8">
        Please follow all rules below to keep StrangerLoop safe and enjoyable for everyone.
      </p>

      <div className="space-y-8">
      
        <div>
          <h2 className="font-semibold text-base text-zinc-200 mb-1">1. Be Respectful</h2>
          <p className="text-zinc-400 text-[15px]">
            Treat others politely. Bullying, insults, hate speech, and harassment are strictly forbidden.
          </p>
        </div>
      
        <div>
          <h2 className="font-semibold text-base text-zinc-200 mb-1">2. Keep It Legal</h2>
          <p className="text-zinc-400 text-[15px]">
            Do not share, discuss, or promote illegal activities, content, or links.
          </p>
        </div>
      
        <div>
          <h2 className="font-semibold text-base text-zinc-200 mb-1">3. No Nudity or Inappropriate Content</h2>
          <p className="text-zinc-400 text-[15px]">
            Explicit, sexual, or NSFW video, images, or language are not allowed. Violations may lead to instant ban.
          </p>
        </div>
       
        <div>
          <h2 className="font-semibold text-base text-zinc-200 mb-1">4. No Spam or Advertising</h2>
          <p className="text-zinc-400 text-[15px]">
            Do not post commercial advertisements, spam links, or solicitations of any kind.
          </p>
        </div>
     
        <div>
          <h2 className="font-semibold text-base text-zinc-200 mb-1">5. Protect Your Privacy</h2>
          <p className="text-zinc-400 text-[15px]">
            Never share passwords, personal addresses, or sensitive information in chat or video.
          </p>
        </div>
       
        <div>
          <h2 className="font-semibold text-base text-zinc-200 mb-1">6. Report Misbehavior</h2>
          <p className="text-zinc-400 text-[15px]">
            If you experience any violation, use the reporting system or disconnect immediately. Help us keep the platform healthy!
          </p>
        </div>
      </div>

      <div className="mt-10 text-zinc-500 text-xs text-right">
        Rules may be updated at any time. Last updated: November 2025
      </div>
    </section>
  </main>
);

export default RulesPage;
