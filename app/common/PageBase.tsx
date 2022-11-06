export default function PageBase() {
  return (
    <div
      id="container"
      className="flex justify-center items-center border-2 border-white"
    >
      <div
        id="main-grid"
        className="grid
        sm:grid-cols-3 
        md:grid-cols-6 
        lg:grid-cols-8 
        xl:grid-cols-10 
        2xl:grid-cols-12 
        text-white gap-2 w-11/12
        border-2 border-blue-900"
      >
        <div className="col-span-2">hello</div>
        <div className="flex flex-col items-center">hello</div>
        <div className="flex flex-col items-center">hello</div>
        <div className="flex flex-col items-center">hello</div>
        <div className="flex flex-col items-center">hello</div>
        <div className="flex flex-col items-center">hello</div>
        <div className="flex flex-col items-center">hello</div>
        <div className="flex flex-col items-center">hello</div>
        <div className="flex flex-col items-center">hello</div>
        <div className="flex flex-col items-center">hello</div>
        <div className="flex flex-col items-center">hello</div>
        <div className="flex flex-col items-center">hello</div>
        <div className="flex flex-col items-center">hello</div>
      </div>
    </div>
  );
}
