"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, BookOpen, Target, TrendingUp, Award, Calendar, Clock, ChevronRight, Sparkles, Brain, MessageSquare, Zap, BarChart3, CheckCircle2, Circle } from 'lucide-react';

// Sample data for the mock analytics tab. Kept static so bars don't change on every re-render.
const MAX_DAILY_HOURS = 5;
const WEEKLY_ACTIVITY = [
  { day: 'Mon', hours: 3 },
  { day: 'Tue', hours: 2 },
  { day: 'Wed', hours: 4 },
  { day: 'Thu', hours: 1 },
  { day: 'Fri', hours: 3 },
  { day: 'Sat', hours: 5 },
  { day: 'Sun', hours: 2 },
];

export default function AImentorPage() {
  // The greeting has no timestamp: this page is prerendered at build time, so a time of day computed
  // here would differ between the server HTML and the browser and break hydration.
  const [messages, setMessages] = useState<{ role: string; content: string; timestamp: string | null }[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your AI mentor. Ask me about your learning path, your goals, or the topic you're studying.",
      timestamp: null
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [learningPath] = useState([
    { id: 1, title: 'Introduction to React', completed: true, duration: '2 hours' },
    { id: 2, title: 'State Management Basics', completed: true, duration: '3 hours' },
    { id: 3, title: 'Advanced Hooks', completed: false, duration: '4 hours', current: true },
    { id: 4, title: 'Performance Optimization', completed: false, duration: '3 hours' },
    { id: 5, title: 'Testing React Applications', completed: false, duration: '5 hours' }
  ]);
  const [goals] = useState([
    { id: 1, title: 'Complete React Fundamentals Course', progress: 65, deadline: '2025-10-20' },
    { id: 2, title: 'Build Personal Portfolio', progress: 40, deadline: '2025-11-15' },
    { id: 3, title: 'Learn TypeScript', progress: 25, deadline: '2025-12-01' }
  ]);
  const [stats] = useState({
    totalHours: 47,
    coursesCompleted: 8,
    currentStreak: 12,
    skillsLearned: 23
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    setTimeout(() => {
      const responses = [
        'That\'s a great question! Let me break this down for you step by step...',
        'I can help you with that. Here\'s what I recommend...',
        'Excellent thinking! Let\'s explore this concept together...',
        'That\'s an important topic. Here\'s a structured approach to learning it...',
        'I understand what you\'re looking for. Let me guide you through this...'
      ];
      
      const aiResponse = {
        role: 'assistant',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-xl shadow-lg">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  AI Mentor
                </h1>
                <p className="text-sm text-gray-500">Your Personal Learning Assistant</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-amber-100 to-yellow-100 px-4 py-2 rounded-full">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-700">{stats.currentStreak} Day Streak!</span>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full flex items-center justify-center text-white font-semibold shadow-lg">
                JD
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Hours</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalHours}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-3 rounded-xl">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Courses</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.coursesCompleted}</p>
              </div>
              <div className="bg-gradient-to-br from-green-100 to-green-200 p-3 rounded-xl">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Streak</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.currentStreak}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-100 to-amber-200 p-3 rounded-xl">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Skills</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.skillsLearned}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-100 to-purple-200 p-3 rounded-xl">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('chat')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'chat'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('learning')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'learning'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4" />
                  <span>Learning Path</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('goals')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'goals'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4" />
                  <span>Goals</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'analytics'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Analytics</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-[600px]">
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start space-x-3 max-w-3xl ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <div className={`flex-shrink-0 ${
                          message.role === 'user' 
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-500' 
                            : 'bg-gradient-to-br from-gray-100 to-gray-200'
                        } p-2 rounded-xl shadow-md`}>
                          {message.role === 'user' ? (
                            <User className="w-5 h-5 text-white" />
                          ) : (
                            <Bot className="w-5 h-5 text-gray-700" />
                          )}
                        </div>
                        <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`${
                            message.role === 'user'
                              ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white'
                              : 'bg-gray-50 text-gray-900 border border-gray-200'
                          } rounded-2xl px-5 py-3 shadow-sm`}>
                            <p className="text-sm leading-relaxed">{message.content}</p>
                          </div>
                          {message.timestamp && (
                            <span className="text-xs text-gray-400 mt-1 px-2">
                              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => setInputValue('Help me understand React hooks better')}
                    className="text-sm px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors border border-indigo-200"
                  >
                    <Zap className="w-3 h-3 inline mr-1" />
                    Explain React Hooks
                  </button>
                  <button
                    onClick={() => setInputValue('Create a study plan for me')}
                    className="text-sm px-4 py-2 bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors border border-purple-200"
                  >
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Study Plan
                  </button>
                  <button
                    onClick={() => setInputValue('Review my progress')}
                    className="text-sm px-4 py-2 bg-pink-50 text-pink-700 rounded-full hover:bg-pink-100 transition-colors border border-pink-200"
                  >
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    Review Progress
                  </button>
                </div>

                {/* Input Area */}
                <div className="flex items-end space-x-3 border-t border-gray-200 pt-4">
                  <div className="flex-1 relative">
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Ask me anything about your learning journey..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-gray-50"
                      rows={3}
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!inputValue.trim()}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Learning Path Tab */}
            {activeTab === 'learning' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Your Learning Path</h3>
                    <p className="text-sm text-gray-500 mt-1">Master React step by step</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Overall Progress</p>
                    <p className="text-2xl font-bold text-indigo-600">40%</p>
                  </div>
                </div>

                {learningPath.map((item) => (
                  <div
                    key={item.id}
                    className={`relative border-l-4 ${
                      item.completed ? 'border-green-500' : item.current ? 'border-indigo-500' : 'border-gray-300'
                    } pl-6 pb-8`}
                  >
                    <div className={`absolute -left-3 w-6 h-6 rounded-full flex items-center justify-center ${
                      item.completed ? 'bg-green-500' : item.current ? 'bg-indigo-500' : 'bg-gray-300'
                    }`}>
                      {item.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : (
                        <Circle className="w-3 h-3 text-white fill-current" />
                      )}
                    </div>
                    <div className="bg-white rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow border border-gray-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {item.duration}
                            </span>
                            {item.completed && (
                              <span className="text-green-600 font-medium flex items-center">
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Completed
                              </span>
                            )}
                            {item.current && (
                              <span className="text-indigo-600 font-medium flex items-center">
                                <Sparkles className="w-4 h-4 mr-1" />
                                In Progress
                              </span>
                            )}
                          </div>
                        </div>
                        <button className="text-indigo-600 hover:text-indigo-700 font-medium text-sm flex items-center">
                          {item.completed ? 'Review' : item.current ? 'Continue' : 'Start'}
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Goals Tab */}
            {activeTab === 'goals' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Your Goals</h3>
                    <p className="text-sm text-gray-500 mt-1">Track your learning objectives</p>
                  </div>
                  <button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md text-sm font-medium">
                    + New Goal
                  </button>
                </div>

                {goals.map((goal) => (
                  <div key={goal.id} className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border border-gray-100">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-lg mb-2">{goal.title}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            Due: {new Date(goal.deadline).toLocaleDateString()}
                          </span>
                          <span className="flex items-center font-medium text-indigo-600">
                            {goal.progress}% Complete
                          </span>
                        </div>
                      </div>
                      <button className="text-indigo-600 hover:text-indigo-700 font-medium text-sm">
                        Edit
                      </button>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Learning Analytics</h3>
                  <p className="text-sm text-gray-500 mt-1">Insights into your progress</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
                    <h4 className="font-semibold text-gray-900 mb-4">Weekly Activity</h4>
                    <div className="space-y-3">
                      {WEEKLY_ACTIVITY.map(({ day, hours }) => {
                        const width = (hours / MAX_DAILY_HOURS) * 100;
                        return (
                          <div key={day} className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-600 w-12">{day}</span>
                            <div className="flex-1 bg-white rounded-full h-6 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-6 rounded-full flex items-center justify-end pr-2"
                                style={{ width: `${width}%` }}
                              >
                                <span className="text-xs text-white font-medium">
                                  {hours}h
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                    <h4 className="font-semibold text-gray-900 mb-4">Top Skills</h4>
                    <div className="space-y-4">
                      {[
                        { skill: 'React', level: 85 },
                        { skill: 'JavaScript', level: 92 },
                        { skill: 'CSS', level: 78 },
                        { skill: 'TypeScript', level: 65 },
                        { skill: 'Node.js', level: 70 }
                      ].map((item) => (
                        <div key={item.skill}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700">{item.skill}</span>
                            <span className="text-green-600 font-semibold">{item.level}%</span>
                          </div>
                          <div className="w-full bg-white rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                              style={{ width: `${item.level}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                  <h4 className="font-semibold text-gray-900 mb-4">Recent Achievements</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { title: 'Fast Learner', description: 'Completed 5 courses in a month', color: 'from-blue-400 to-blue-600' },
                      { title: 'Consistency King', description: '30-day learning streak', color: 'from-amber-400 to-amber-600' },
                      { title: 'React Master', description: 'Mastered React fundamentals', color: 'from-purple-400 to-purple-600' }
                    ].map((achievement, index) => (
                      <div key={index} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
                        <div className={`bg-gradient-to-r ${achievement.color} w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-lg`}>
                          <Award className="w-6 h-6 text-white" />
                        </div>
                        <h5 className="font-semibold text-gray-900 mb-1">{achievement.title}</h5>
                        <p className="text-xs text-gray-600">{achievement.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}