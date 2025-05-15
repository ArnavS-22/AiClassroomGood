export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-serif text-4xl font-bold mb-8 text-center">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-violet-600 animate-gradient">
            About Curriculum AI
          </span>
        </h1>

        <div className="prose prose-lg max-w-none">
          <p>
            Curriculum AI was created with a simple mission: to help teachers save time and help students learn more
            effectively.
          </p>

          <h2 className="font-serif text-2xl font-semibold mt-8 mb-4">Our Mission</h2>
          <p>
            We believe that teachers should spend less time on repetitive tasks and more time on what matters most:
            connecting with students and inspiring a love of learning. By leveraging the power of AI, we're making it
            possible for teachers to upload their curriculum once and generate personalized learning experiences for
            every student.
          </p>

          <h2 className="font-serif text-2xl font-semibold mt-8 mb-4">How It Works</h2>
          <ol>
            <li>Teachers upload their curriculum materials</li>
            <li>Our AI analyzes and structures the content</li>
            <li>Students access personalized lessons based on the teacher's materials</li>
            <li>Students can ask questions and get immediate help through our AI chat</li>
          </ol>

          <h2 className="font-serif text-2xl font-semibold mt-8 mb-4">Testimonials</h2>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 my-6">
            <p className="italic">
              ""
            </p>
            <p className="font-medium mt-4">— </p>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 my-6">
            <p className="italic">
              
            </p>
            <p className="font-medium mt-4">— </p>
          </div>
        </div>
      </div>
    </div>
  )
}
