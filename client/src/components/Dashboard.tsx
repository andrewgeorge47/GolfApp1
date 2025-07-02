import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ArrowRight, UserPlus, Star, Flag, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '../AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-4 w-16 h-16 md:w-20 md:h-20 bg-brand-neon-green/20 rounded-full animate-pulse"></div>
        <div className="absolute top-20 right-4 w-12 h-12 md:w-16 md:h-16 bg-white/10 rounded-full animate-bounce" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-16 left-1/4 w-8 h-8 md:w-12 md:h-12 bg-brand-neon-green/30 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-24 right-1/3 w-16 h-16 md:w-24 md:h-24 bg-white/5 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-5xl mx-auto w-full">
        {/* Hero Section */}
        <div className="text-center mb-8 md:mb-12">
          {/* Logo with Animation */}
          <div className="mb-6 md:mb-8 transform hover:scale-105 transition-transform duration-300">
            <img src={process.env.PUBLIC_URL + "/logo_full_Light.png"} alt="Neighborhood National Logo" className="h-20 w-auto md:h-28 mx-auto drop-shadow-2xl" />
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-4 md:mb-6 leading-tight px-2">
            <span className="bg-gradient-to-r from-brand-neon-green via-white to-brand-neon-green bg-clip-text text-transparent">
              Player Portal
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-2xl lg:text-3xl text-white/80 mb-6 md:mb-8 max-w-3xl mx-auto leading-relaxed px-4">
            Your <span className="text-brand-neon-green font-bold">simulator rounds</span> now have a home. 
            <br className="hidden sm:block" />
            Track, compete, and connect across all clubs.
          </p>

          {/* Feature Highlights */}
          <div className="flex md:grid md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12 max-w-4xl mx-auto px-4 overflow-x-auto md:overflow-visible scrollbar-hide">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group flex-shrink-0 w-64 md:w-auto">
              <Flag className="w-8 h-8 md:w-12 md:h-12 text-brand-neon-green mx-auto mb-3 md:mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-white font-bold text-base md:text-lg mb-2">Track Rounds</h3>
              <p className="text-white/70 text-xs md:text-sm">Log every simulator session with detailed scoring</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group flex-shrink-0 w-64 md:w-auto">
              <Users className="w-8 h-8 md:w-12 md:h-12 text-brand-neon-green mx-auto mb-3 md:mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-white font-bold text-base md:text-lg mb-2">Club Activity</h3>
              <p className="text-white/70 text-xs md:text-sm">See what's happening across all locations</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group flex-shrink-0 w-64 md:w-auto">
              <TrendingUp className="w-8 h-8 md:w-12 md:h-12 text-brand-neon-green mx-auto mb-3 md:mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-white font-bold text-base md:text-lg mb-2">Stay Connected</h3>
              <p className="text-white/70 text-xs md:text-sm">Compete and socialize with fellow members</p>
            </div>
          </div>

          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center items-center px-4">
            <Link to="/claim-account" className="group transform hover:scale-105 transition-all duration-300 w-full sm:w-auto">
              <div className="bg-gradient-to-r from-brand-neon-green to-emerald-400 hover:from-emerald-400 hover:to-brand-neon-green text-brand-black px-6 py-4 md:px-10 md:py-5 rounded-2xl font-bold text-lg md:text-xl shadow-2xl hover:shadow-brand-neon-green/25 transition-all duration-300 flex items-center justify-center min-w-[200px] w-full">
                <UserPlus className="w-6 h-6 md:w-7 md:h-7 mr-2 md:mr-3" />
                Claim Account
                <ArrowRight className="w-5 h-5 md:w-6 md:h-6 ml-2 md:ml-3 group-hover:translate-x-2 transition-transform" />
              </div>
            </Link>
            <Link to="/leaderboard" className="group transform hover:scale-105 transition-all duration-300 w-full sm:w-auto">
              <div className="bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white border-2 border-white/30 hover:border-white/50 px-6 py-4 md:px-10 md:py-5 rounded-2xl font-bold text-lg md:text-xl transition-all duration-300 flex items-center justify-center min-w-[200px] w-full">
                <Trophy className="w-6 h-6 md:w-7 md:h-7 mr-2 md:mr-3" />
                View Leaderboard
                <ArrowRight className="w-5 h-5 md:w-6 md:h-6 ml-2 md:ml-3 group-hover:translate-x-2 transition-transform" />
              </div>
            </Link>
          </div>

          {/* Social Proof */}
          <div className="mt-8 md:mt-12 text-center px-4">
            <p className="text-white/60 text-xs md:text-sm mb-3 md:mb-4">Trusted by members across all Neighborhood National locations</p>
            <div className="flex justify-center space-x-4 md:space-x-8 opacity-60">
              <div className="text-center">
                <div className="text-lg md:text-2xl font-bold text-brand-neon-green">200+</div>
                <div className="text-white/70 text-xs">Active Members</div>
              </div>
              <div className="text-center">
                <div className="text-lg md:text-2xl font-bold text-brand-neon-green">450+</div>
                <div className="text-white/70 text-xs">Rounds Tracked</div>
              </div>
              <div className="text-center">
                <div className="text-lg md:text-2xl font-bold text-brand-neon-green">9</div>
                <div className="text-white/70 text-xs">Club Locations</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 