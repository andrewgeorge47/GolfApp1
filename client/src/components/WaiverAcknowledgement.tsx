import React, { useState } from 'react';
import { FileText, CheckCircle, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { Checkbox } from './ui/Checkbox';

interface WaiverAcknowledgementProps {
  onComplete: () => void;
  onBack: () => void;
}

const WAIVER_TEXT = `RELEASE OF LIABILITY AND ASSUMPTION OF RISK

I am choosing to participate in using a golf simulator and the related facilities (the "Activity") leased by Neighborhood National, LLC a North Carolina limited liability company (the "Company"), located at 4409 Randall Rd, Durham, NC 27707 (the "Club"). In consideration of being permitted by the Company and the Club to participate in the Activity and in recognition of the Company's and Club's reliance hereon, I agree to all the terms and conditions set forth in this instrument (this "Release").

I AM AWARE AND UNDERSTAND THAT THE ACTIVITY IS A POTENTIALLY DANGEROUS ACTIVITY AND INVOLVES THE RISK OF SERIOUS INJURY, DISABILITY, DEATH, AND/OR PROPERTY DAMAGE. I ACKNOWLEDGE THAT ANY INJURIES THAT I SUSTAIN MAY RESULT FROM OR BE COMPOUNDED BY THE ACTIONS, OMISSIONS, OR NEGLIGENCE OF THE COMPANY OR THE CLUB. NOTWITHSTANDING THE RISK, I ACKNOWLEDGE THAT I AM VOLUNTARILY PARTICIPATING IN THE ACTIVITY WITH KNOWLEDGE OF THE DANGER INVOLVED AND HEREBY AGREE TO ACCEPT AND ASSUME ANY AND ALL RISKS OF INJURY, DISABILITY, DEATH, AND/OR PROPERTY DAMAGE ARISING FROM MY PARTICIPATION IN THE ACTIVITY, WHETHER CAUSED BY THE ORDINARY NEGLIGENCE OF THE COMPANY OR THE CLUB OR OTHERWISE.

I hereby expressly waive and release any and all claims, now known or hereafter known, against the Company, the Club, the Club owner, and their officers, directors, manager(s), owners, employees, agents, affiliates, shareholders/members, successors, and assigns (collectively, "Releasees"), on account of injury, disability, death, or property damage arising out of or attributable to my participation in the Activity, whether arising out of the ordinary negligence of the Company, the Club, the Club owner, or any other Releasees or otherwise. I covenant not to make or bring any such claim against the Company, the Club, the Club owner, or any other Releasee, and forever release and discharge the Company, the Club, and all other Releasees from liability under such claims. This waiver and release does not extend to claims for gross negligence, willful misconduct, or any other liabilities that North Carolina law does not permit to be released by agreement.

I shall defend, indemnify, and hold harmless the Company, the Club, the Club owner, and all other Releasees against any and all losses, damages, liabilities, deficiencies, claims, actions, judgments, settlements, interest, awards, penalties, fines, costs, or expenses of whatever kind, including reasonable attorney fees, fees, the costs of enforcing any right to indemnification under this Release, and the cost of pursuing any insurance providers, incurred by/awarded against the Company, the Club, the Club owner, or any other Releasees arising out or resulting from any claim of a third party related to my participation in the Activity, including any claim related to my own negligence or the ordinary negligence of the Company, the Club, or the Club owner.

This Release and the Membership Agreement constitute the sole and entire agreement of the Company and me with respect to the subject matter contained herein and supersedes all prior and contemporaneous understandings, agreements, representations, and warranties, both written and oral, with respect to such subject matter. If any term or provision of this Release is invalid, illegal, or unenforceable in any jurisdiction, such invalidity, illegality, or unenforceability shall not affect any other term or provision of this Release or invalidate or render unenforceable such term or provision in any other jurisdiction. This Release is binding on and shall inure to the benefit of the Company, the Club, the Club Owner, and me and their respective successors and assigns. All matters arising out of or relating to this Release shall be governed by and construed in accordance with the internal laws of the State of North Carolina without giving effect to any choice or conflict of law provision or rule (whether of the State of North Carolina or any other jurisdiction). Any claim or cause of action arising under this Release may be brought only in the federal and state courts located in Greensboro, North Carolina and I hereby consent to the exclusive jurisdiction of such courts.

BY ANSWERING "YES" TO THE QUESTION BELOW, I ACKNOWLEDGE THAT I HAVE READ AND UNDERSTOOD ALL OF THE TERMS OF THIS RELEASE AND THAT I AM VOLUNTARILY GIVING UP SUBSTANTIAL LEGAL RIGHTS, INCLUDING THE RIGHT TO SUE THE COMPANY.`;

const WaiverAcknowledgement: React.FC<WaiverAcknowledgementProps> = ({
  onComplete,
  onBack,
}) => {
  const [videoWatched, setVideoWatched] = useState(false);
  const [waiverRead, setWaiverRead] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleVideoComplete = () => {
    setVideoWatched(true);
  };

  const handleWaiverScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom =
      Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 20;
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleSubmit = async () => {
    if (!acknowledged) return;

    setSubmitting(true);
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    onComplete();
  };

  const canAcknowledge = videoWatched && hasScrolledToBottom;

  return (
    <div className="max-w-3xl mx-auto">
      <Card variant="elevated" padding="lg">
        <CardHeader
          title={
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-brand-dark-green" />
              <span>Waiver & Release Form</span>
            </div>
          }
          subtitle="Watch the short video and read the waiver to unlock booking access"
        />

        <CardContent>
          {/* Video Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              {videoWatched ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <span className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs font-medium text-gray-500">
                  1
                </span>
              )}
              <h3 className="text-lg font-semibold text-gray-900">
                Watch the 10-second Waiver Video
              </h3>
            </div>

            <p className="text-gray-600 mb-4 text-sm">
              This video may make you laugh, but the point is serious - agreeing to
              the waiver is required to use the club.
            </p>

            <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
              {!videoWatched ? (
                <>
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src="https://youtube.com/embed/QclNVkld1UU"
                    title="Waiver Video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <Button
                      variant="primary"
                      icon={CheckCircle}
                      onClick={handleVideoComplete}
                      className="shadow-lg"
                    >
                      I've Watched the Video
                    </Button>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-green-900/20">
                  <div className="text-center">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                    <p className="text-green-400 font-medium">Video Watched!</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Waiver Text Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              {hasScrolledToBottom ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <span className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs font-medium text-gray-500">
                  2
                </span>
              )}
              <h3 className="text-lg font-semibold text-gray-900">
                Read the Full Waiver
              </h3>
            </div>

            {!hasScrolledToBottom && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Please scroll to the bottom to read the entire waiver
              </p>
            )}

            <div
              className="h-64 overflow-y-auto border border-gray-300 rounded-lg p-4 bg-gray-50 text-sm text-gray-700 leading-relaxed"
              onScroll={handleWaiverScroll}
            >
              <pre className="whitespace-pre-wrap font-sans">{WAIVER_TEXT}</pre>
            </div>
          </div>

          {/* Acknowledgement Section */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-4">
              {acknowledged ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <span className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs font-medium text-gray-500">
                  3
                </span>
              )}
              <h3 className="text-lg font-semibold text-gray-900">
                Acknowledge & Accept
              </h3>
            </div>

            <div
              className={`p-4 rounded-lg border-2 transition-all ${
                canAcknowledge
                  ? acknowledged
                    ? 'border-green-300 bg-green-50'
                    : 'border-brand-dark-green bg-white'
                  : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
            >
              <Checkbox
                label={
                  <span className="font-medium">
                    I have read and understood all of the terms of this Release and I am
                    voluntarily giving up substantial legal rights, including the right to
                    sue the Company.
                  </span>
                }
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                disabled={!canAcknowledge}
              />

              {!canAcknowledge && (
                <p className="mt-2 text-xs text-gray-500 ml-7">
                  Complete steps 1 and 2 above to enable this checkbox
                </p>
              )}
            </div>
          </div>

          {acknowledged && (
            <div className="p-4 bg-green-100 border border-green-300 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">
                    You're almost there!
                  </p>
                  <p className="text-green-700 text-sm">
                    Click "Complete & Unlock Booking" to finish the onboarding process
                    and gain access to the simulator booking system.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter divided>
          <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
            Back
          </Button>

          <Button
            variant="success"
            icon={ArrowRight}
            iconPosition="right"
            onClick={handleSubmit}
            disabled={!acknowledged}
            loading={submitting}
          >
            Complete & Unlock Booking
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default WaiverAcknowledgement;
