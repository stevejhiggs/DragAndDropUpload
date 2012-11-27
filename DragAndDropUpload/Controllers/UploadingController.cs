using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Runtime.Serialization;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;
using System.Web.Http;

namespace DragAndDropUpload.Controllers
{
    public class UploadingController : ApiController
    {
        public Task<IEnumerable<FileDesc>> Post()
        {
            string folderName = "uploads/blocks";
            string PATH = HttpContext.Current.Server.MapPath("~/"+folderName);
            string rootUrl = Request.RequestUri.AbsoluteUri.Replace(Request.RequestUri.AbsolutePath, String.Empty);

            if (Request.Content.IsMimeMultipartContent())
            {
                var streamProvider = new MultipartFormDataStreamProvider(PATH);
                var task = Request.Content.ReadAsMultipartAsync(streamProvider).ContinueWith<IEnumerable<FileDesc>>(t =>
                {

                    if (t.IsFaulted || t.IsCanceled)
                    {
                        throw new HttpResponseException(HttpStatusCode.InternalServerError);
                    }

                    var fileInfo = streamProvider.FileData.Select(i =>
                    {
                                            //spit the info given to us by the client
                        string[] clientoptions = i.Headers.ContentDisposition.Name.Split(new char[] {','}, StringSplitOptions.RemoveEmptyEntries);
                        string clientFilenumString = Regex.Replace(clientoptions[0], "[^\\d]", "");
                        string clientBlocknumString = Regex.Replace(clientoptions[1], "[^\\d]", "");

                        var info = new FileInfo(i.LocalFileName);
                        return new FileDesc(int.Parse(clientFilenumString), int.Parse(clientBlocknumString), info.Name, rootUrl + "/" + folderName + "/" + info.Name, info.Length / 1024);
                    });
                    return fileInfo;
                });
                
                return task;
            }
            else
            {
                throw new HttpResponseException(Request.CreateResponse(HttpStatusCode.NotAcceptable, "This request is not properly formatted"));
            }

        }

        public string GetLocalFileName(System.Net.Http.Headers.HttpContentHeaders headers)
        {
            var name = !string.IsNullOrWhiteSpace(headers.ContentDisposition.FileName) ? headers.ContentDisposition.FileName : "NoName";
            return name.Replace("\"", string.Empty);
        }
    }

    [DataContract]
    public class FileDesc
    {
        [DataMember]
        public int clientfileindex { get; set; }

        [DataMember]
        public int clientblobindex { get; set; }
        [DataMember]
        public string name { get; set; }

        [DataMember]
        public string path { get; set; }

        [DataMember]
        public long size { get; set; }

        public FileDesc(int fi, int bi, string n, string p, long s)
        {
            this.clientfileindex = fi;
            this.clientblobindex = bi;
            this.name = n;
            this.path = p;
            this.size = s;
        }
    }

}
